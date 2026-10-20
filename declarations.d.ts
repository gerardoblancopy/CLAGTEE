declare module '*.png' {
  const value: string;
  export default value;
}

// Vite: `import url from 'archivo?url'` devuelve la URL pública del recurso
declare module '*?url' {
  const value: string;
  export default value;
}
