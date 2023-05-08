declare class HttpError extends Error {
    public readonly statusCode: number;

    public resultAnalysis: ResultAnalysis[];

    public data?: Record<string, any> | string | number;

    public get errorObject(): {
        isSuccess: boolean,
        statusCode: number,
        errorMessage: string,
        resultAnalysis: ResultAnalysis[],
        data?: Record<string, any> | string | number
    }
}

type ResultAnalysis = {
    isSuccess: boolean,
    from: string,
    errorMessage?: string,
    timeInMilliSec: number,
    data?: Record<string, any>
};

declare namespace Express {
    export interface Response {
        startTime: [number, number],
        statusCode: number,
        error?: HttpError,
        body: ResultAnalysisReturnType<any>
    }
}

type ResultAnalysisReturnType<T> = {
    isSuccess: boolean;
    errorMessage?: string;
    resultAnalysis: ResultAnalysis[];
    data?: T
}