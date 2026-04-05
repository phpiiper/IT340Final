import express from 'express';
import mainRoute from './api/main.route.js';
import dotenv from "dotenv"
import cookieParser from 'cookie-parser'

const app = express();
const port = 3000;
dotenv.config()

app.use(express.json());
app.use(cookieParser());
app.use('/api', mainRoute);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});