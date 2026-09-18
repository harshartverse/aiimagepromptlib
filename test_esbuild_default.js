import uuidPkg from 'uuid';
const uuidv4 = uuidPkg.v4 || uuidPkg.default?.v4 || uuidPkg;
console.log(typeof uuidv4);
