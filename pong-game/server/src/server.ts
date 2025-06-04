import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors:{
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
}
);

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res)=>{
    res.json({message: 'hello from pong server'});
});

server.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
});