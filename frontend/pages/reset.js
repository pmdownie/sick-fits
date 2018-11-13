import React from 'react'
import Reset from '../components/Reset'

const ResetPage = ({ query }) => {
    return (
        <div>
            Reset your password {query.resetToken}
            <Reset resetToken={query.resetToken} />
        </div>
    )
}

export default ResetPage
