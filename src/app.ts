import express from "express";
import morgan from 'morgan';
import reRoutes from './routers/reRoutes';
import bodyParser from 'body-parser';
import * as executionTimeMiddlewares from './middlewares/executionTimeMiddleware';
const app = express();


let PORT = 80


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(morgan('dev'));

app.use(executionTimeMiddlewares.startTimeMiddleware);
app.use('/', reRoutes);
app.use(executionTimeMiddlewares.endTimeMiddleware);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})