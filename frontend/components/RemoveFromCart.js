import React, { Component } from 'react'
import { Mutation } from 'react-apollo'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import gql from 'graphql-tag'
import { CURRENT_USER_QUERY } from './User'

const REMOVE_ROM_CART_MUTATION = gql`
    mutation removeCartItem($id: ID!) {
        removeCartItem(id: $id) {
            id
        }
    }
`

const BigButton = styled.button`
    font-size: 3rem;
    background: none;
    border: 0;
    &:hover {
        color: ${props => props.theme.red};
        cursor: pointer;
    }
`

class RemoveFromCart extends Component {
    static propTypes = {
        id: PropTypes.string.isRequired,
    }

    // This gets called as soon as we get a response back fom the server after the mutation has been performed
    update = (cache, payload) => {
        // 1. read the cache
        const data = cache.readQuery({ query: CURRENT_USER_QUERY })
        // 2. remove item from cart
        const cartItemId = payload.data.removeCartItem.id
        data.me.cart = data.me.cart.filter(
            cartItem => cartItem.id !== cartItemId
        )
        // 3. write it back to the cache
        cache.writeQuery({ query: CURRENT_USER_QUERY, data })
    }

    render() {
        return (
            <Mutation
                mutation={REMOVE_ROM_CART_MUTATION}
                variables={{ id: this.props.id }}
                update={this.update}
                optimisticResponse={{
                    __typename: 'Mutation',
                    removeCartItem: {
                        __typename: 'CartItem',
                        id: this.props.id,
                    },
                }}
            >
                {(removeCartItem, { loading, error }) => (
                    <BigButton
                        disabled={loading}
                        onClick={() => {
                            removeCartItem().catch(err => alert(err.message))
                        }}
                        title="Delete Item"
                    >
                        &times;
                    </BigButton>
                )}
            </Mutation>
        )
    }
}

export default RemoveFromCart
