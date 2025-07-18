import express from 'express';
import 'dotenv/config';
import contactRoutes from './src/routes/contact.routes.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/', contactRoutes);

// Basic route to check if the server is running
app.get('/', (req, res) => {
  res.send('Server is healthy and running!');
});

app.listen(port, () => {
  console.log(`Server is running on Port: ${port}`);
});