import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import { CURRENT_USER_QUERY } from './User'
import Form from './styles/Form'
import Error from './ErrorMessage'

const RESET_MUTATION = gql`
    mutation RESET_MUTATION(
        $resetToken: String!
        $password: String!
        $confirmPassword: String!
    ) {
        resetPassword(
            resetToken: $resetToken
            password: $password
            confirmPassword: $confirmPassword
        ) {
            id
            name
            email
        }
    }
`

class Reset extends Component {
    static propTypes = {
        resetToken: PropTypes.string.isRequired,
    }

    state = {
        password: '',
        confirmPassword: '',
    }

    saveToState = e => this.setState({ [e.target.name]: e.target.value })

    render() {
        return (
            <Mutation
                mutation={RESET_MUTATION}
                variables={{
                    password: this.state.password,
                    confirmPassword: this.state.confirmPassword,
                    resetToken: this.props.resetToken,
                }}
                refetchQueries={[{ query: CURRENT_USER_QUERY }]}
            >
                {(reset, { error, loading, called }) => (
                    <Form
                        method="POST"
                        onSubmit={async e => {
                            e.preventDefault()
                            await reset()
                            this.setState({ password: '', confirmPassword: '' })
                        }}
                    >
                        <fieldset disabled={loading} aria-busy={loading}>
                            <h2>Reset your passwordt</h2>
                            <Error error={error} />
                            <label htmlFor="password">
                                Password
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    value={this.state.password}
                                    onChange={this.saveToState}
                                />
                            </label>
                            <label htmlFor="confirmPassword">
                                Confirm Password
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Confirm Password"
                                    value={this.state.confirmPassword}
                                    onChange={this.saveToState}
                                />
                            </label>
                            <button type="submit">Reset Your Password</button>
                        </fieldset>
                    </Form>
                )}
            </Mutation>
        )
    }
}

export default Reset
