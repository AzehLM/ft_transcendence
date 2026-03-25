import { useState } from 'react'
import { Greeting } from '../components/Test'

function LoginPage() {
const [name, setName] = useState('')

    return (
        <div>
            <h1>Ft_box</h1>
            <Greeting name={name} onNameChange={setName} />
            <p>We are on the login page</p>
        </div>
    )
}

export default LoginPage