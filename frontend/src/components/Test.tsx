type GreetingProps = {
    name: string
    onNameChange: (value: string) => void
}

export function Greeting({ name, onNameChange } : GreetingProps) {
    return (
        <section>
    <h1>Hello, {name || 'stranger'} !</h1>
    <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Type your name"
    />
    </section>
)
} 