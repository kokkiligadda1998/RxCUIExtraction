import { NextFunction, Request, Response } from "express";
import parseHrtimeToMilliSeconds from "../utils/parseHrtimeToSeconds";


export const startTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {

    const startTime = process.hrtime();
    res.startTime = startTime;
    next();

}

export const endTimeMiddleware = (req: Request, res: Response) => {

    try {

        const startTime = res.startTime;

        const timeTaken = parseHrtimeToMilliSeconds(process.hrtime(startTime));

        let resultAnalysis: ResultAnalysis[];

        if (res.error) {

            console.log("Error " + JSON.stringify(res.error.errorObject, null, 2));

            resultAnalysis = res.error.resultAnalysis;

            const resBody: any = {
                isSuccess: false,
                errorMessage: res.error.message
            };

            if (res.error.statusCode === 500) resBody.errorMessage = "Internal Server Error";
            else if (res.error.data) resBody.data = res.error.data

            res.status(res.error.statusCode).json(resBody);

        } else {

            resultAnalysis = res.body.resultAnalysis;

            let resBody: any = {};

            if (Array.isArray(res.body.data)) {
                resBody = {
                    isSuccess: true,
                    data: res.body.data
                }
            } else if (typeof res.body.data === 'object') {
                resBody = {
                    isSuccess: true,
                    ...res.body.data
                }
            } else {
                resBody = {
                    isSuccess: true,
                    data: res.body.data
                }
            }

            res.status(res.statusCode).json(resBody);
        }
    } catch (e) {
        return res.status(500).end("Internal Server Error");
    }

}