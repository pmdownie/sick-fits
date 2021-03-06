const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomBytes } = require('crypto')
const { promisify } = require('util')
const { transport, makeANiceEmail } = require('../mail')
const { hasPermission } = require('../utils')

const Mutations = {
    async createItem(parent, args, ctx, info) {
        if (!ctx.request.userId)
            throw new Error('You must be logged in to do that')

        const item = await ctx.db.mutation.createItem(
            {
                data: {
                    user: {
                        connect: {
                            id: ctx.request.userId,
                        },
                    },
                    ...args,
                },
            },
            info
        )

        return item
    },
    updateItem(parent, args, ctx, info) {
        // first take a copy of the args
        const updates = { ...args }
        // remove ID from the update
        delete updates.id
        // run the update method
        return ctx.db.mutation.updateItem(
            {
                data: updates,
                where: {
                    id: args.id,
                },
            },
            info
        )
    },
    async deleteItem(parent, args, ctx, info) {
        const where = { id: args.id }
        // 1. find the item
        const item = await ctx.db.query.item(
            { where },
            '{ id title user {id} }'
        )
        // 2. Check if they own that item, or have the permissions
        const ownsItem = item.user.id === ctx.request.userId
        const hasPermissions = ctx.request.user.permissions.some(permission =>
            ['ADMIN', 'ITEMDELETE'].includes(permission)
        )

        if (!ownsItem || !hasPermissions) {
            throw new Error('You don;t have permission to do that!!')
        }

        // 3. Delete it!
        return ctx.db.mutation.deleteItem({ where }, info)
    },

    async signup(parent, args, ctx, info) {
        args.email = args.email.toLowerCase()
        // hash their password
        const password = await bcrypt.hash(args.password, 10)
        // create user in db
        const user = await ctx.db.mutation.createUser(
            {
                data: {
                    ...args,
                    password,
                    permissions: { set: ['USER'] },
                },
            },
            info
        )
        // create the JWT for them
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
        // set JWT as a cookie on the response
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
        })
        // Finalllllyyyy we return the user to the browser
        return user
    },

    async signin(parent, { email, password }, ctx) {
        // 1. check if user with email
        const user = await ctx.db.query.user({ where: { email } })

        if (!user) {
            throw new Error(`No email found for email ${email}`)
        }

        // 2. check if password is correct
        const valid = await bcrypt.compare(password, user.password)

        if (!valid) {
            throw new Error('Invalid password')
        }

        // 3. Generate JWT token
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

        // 4. Set the cookie
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
        })
        // 5. Return the user

        return user
    },
    signout(parent, args, ctx) {
        ctx.response.clearCookie('token')

        return { message: 'Success full logged out' }
    },
    async requestReset(parent, { email }, ctx, info) {
        // 1. Check is real user
        const user = await ctx.db.query.user({ where: { email } })
        if (!user) throw new Error(`No such user found for email ${email}`)
        //  2. Set a reset token and expiry on the user
        const randomBytesPromise = promisify(randomBytes)
        const resetToken = (await randomBytesPromise(20)).toString('hex')
        const resetTokenExpiry = Date.now() + 3600000
        const res = await ctx.db.mutation.updateUser({
            where: { email },
            data: { resetToken, resetTokenExpiry },
        })
        // 3. Email the reset token
        const mailResponse = await transport.sendMail({
            from: 'pmdownie@gmail.com',
            to: user.email,
            subject: 'Your password reset token',
            html: makeANiceEmail(
                `Your password reset token is here: \n\n<a href="${
                    process.env.FRONTEND_URL
                }/reset?resetToken=${resetToken}">Click here to Reset Your Password</a>`
            ),
        })
        // 4. Return message
        return { message: 'reset request' }
    },
    async resetPassword(
        parent,
        { password, confirmPassword, email, resetToken },
        ctx,
        info
    ) {
        // 1. Check if the password is a match
        if (password !== confirmPassword)
            throw new Error('Passwords dont match')
        // 2. Check if its a legit token

        // 3. Check if its expired
        const [user] = await ctx.db.query.users({
            where: {
                resetToken,
                resetTokenExpiry_gte: Date.now() - 3600000,
            },
        })
        if (!user) throw new Error('Token expired or invalid token')
        // 4. Hash their password
        const newPassword = await bcrypt.hash(password, 10)
        // // 5. Save the new password to the user and remove token
        const updatedUser = await ctx.db.mutation.updateUser({
            where: { email: user.email },
            data: {
                password: newPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        })
        // // 6. Create JWT
        const token = jwt.sign(
            { userId: updatedUser.id },
            process.env.APP_SECRET
        )
        //  7. Set token in cookie
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
        })
        // 8. Return user
        return updatedUser
    },
    async updatePermissions(parent, args, ctx, info) {
        // 1. Check if they are logged in
        if (!ctx.request.userId) {
            throw new Error('You must be logged in!')
        }
        // 2. Query the current user
        const currentUser = await ctx.db.query.user(
            {
                where: {
                    id: ctx.request.userId,
                },
            },
            info
        )
        // 3. Check if they have permissions to do this
        hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE'])
        // 4. Update the permissions
        return ctx.db.mutation.updateUser(
            {
                data: {
                    permissions: {
                        set: args.permissions,
                    },
                },
                where: {
                    id: args.userId,
                },
            },
            info
        )
    },
    async addToCart(parent, args, ctx, info) {
        //  1. Make sure they're signed in
        const { userId } = ctx.request
        if (!userId) throw new Error('You must be signed in to continue!')
        //  2. Query the users current cart
        const [existingCartItem] = await ctx.db.query.cartItems({
            where: {
                user: { id: userId },
                item: { id: args.id },
            },
        })
        //  3. Check if that item is already in their cart and increment by one if is
        if (existingCartItem) {
            console.log('This item is already in their cart')
            return ctx.db.mutation.updateCartItem(
                {
                    where: { id: existingCartItem.id },
                    data: { quantity: existingCartItem.quantity + 1 },
                },
                info
            )
        }
        // 4. If not, create fresh cart item for that user
        return ctx.db.mutation.createCartItem(
            {
                data: {
                    user: {
                        connect: { id: userId },
                    },
                    item: {
                        connect: { id: args.id },
                    },
                },
            },
            info
        )
    },
    async removeCartItem(parent, args, ctx, info) {
        // 1. Find cart item
        const cartItem = await ctx.db.query.cartItem(
            {
                where: { id: args.id },
            },
            `{id, user { id }}`
        )

        if (!cartItem) throw new Error('No cart item found')
        // 2. Make sure they own cart item
        if (cartItem.user.id !== ctx.request.userId) {
            throw new Error('Cheatin hhuuuuuuuhh')
        }
        // 3. Delete cart item
        return ctx.db.mutation.deleteCartItem(
            {
                where: { id: args.id },
            },
            info
        )
    },
}

module.exports = Mutations
