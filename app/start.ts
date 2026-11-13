import { createServer } from './server';

const PORT = parseInt(process.env.PORT || '3000', 10);

createServer().listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});
