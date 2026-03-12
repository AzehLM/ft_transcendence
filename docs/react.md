# REACT
## Update Node
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc
nvm install node
```

## Set up React App
```
npx create-react-app my-app
cd my-app
npm install react-router-dom
npm start
```

## Typescript 
```
npm install typescript@4.9.5 --save-dev
npx tsc --init
```
- change .js into .tsx
- change tsconfig.json by adding :
```
{
  "compilerOptions": {
    "target": "ES6",
    "module": "ESNext",
    "moduleResolution": "Node",
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```
- and removing: ```"verbatimModuleSyntax": true```
- to remove error linked to import of .css
    - create src/global.d.ts
    - write in it : ```declare module "*.css";```

## Linked to API
### use fetch for GET
- In DB, I created a table Infos with column : id and description
- useState
    - React Hook that allow to add a state variable to your component
    - const [infos, setInfos] = useState<Info[]>([]);
        - Definition of Info beforehand
            -   type Info = { id: number; description: string; }
        - here, return a table with 2 elements (the current value of the state (infos) and the fonction to modify this state (setInfos))
        - when setInfos is called and then upadte the variable (infos), it will trigger a new render of the componant
        - The arguments is [] which init the state as an empty table
- useEffect
    - React Hook that allow to execute code after the rendering of a component
    - Perfect for API call as it can be done after the rendering of the page
- fetch
    - send a request to the API
    - (res) => res.json() : transform the response into a JSON
    - data => setInfos(data) : update the state of the data received
- map
    - allow to go through a table ( infos.map((info) => ( what we will do with each info)) )
    - we can then access each info 1 by 1 and get the infrmation in it 
