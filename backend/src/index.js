require("dotenv").config({ path: "variables.env" });
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const createServer = require("./createServer");
const db = require("./db");

const server = createServer();

// TODO use express middleware to handle cookies (JWT)
server.express.use(cookieParser());
server.express.use((req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    const { userId } = jwt.verify(token, process.env.APP_SECRET);
    // put the userId onto the req for future requests to access
    req.userId = userId;
  }
  next();
});
// TODO Use express middleware to populate current users

server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  },
  deets => {
    console.log(`Server is now runnig on port http://localhost:${deets.port}`);
  }
);
