import * as reHelper from "../helpers/reHelper";
import { Request, Response,NextFunction } from "express";
import { HttpError } from "../utils/HttpError";



export const RxCUIExtraction = async (req: Request, res: Response,next: NextFunction) => {

    const reqBody = req.body as {
        atcClass?: string,
        drugList?: string
    };

    res.contentType("application/json");

    try {

        const result = await reHelper.extractRXCUI(reqBody,req.file as Express.Multer.File);

        res.body = result;

        res.statusCode = 200;

        next();

    }
    catch (error) {

        const e = HttpError.convertErrorToHttpError(error as Error);

        res.error = e;

        next();

    }
}