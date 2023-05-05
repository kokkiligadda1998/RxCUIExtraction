import * as reHelper from "../helpers/reHelper";
import { Request, Response } from "express";
//import { HttpError } from "../utils/HttpError";



export const RxCUIExtraction = async (req: Request, res: Response) => {

    const reqBody = req.body as {
        atcClass?: string,
        drugList?: string,
        fromATC: boolean,
        fromString: boolean
    };

    res.contentType("application/json");

    try {

        const result = await reHelper.extractRXCUI(reqBody,req.file as Express.Multer.File);


        res.statusCode = 200;
        res.send(result);


    }
    catch (error) {

        throw error;

    }
}