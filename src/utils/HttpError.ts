
export class HttpError extends Error {

    public readonly statusCode: number;

    public resultAnalysis: ResultAnalysis[];

    public data?: Record<string, any> | string | number;

    public get errorObject() {
        return {
            isSuccess: false,
            statusCode: this.statusCode,
            errorMessage: this.message,
            resultAnalysis: this.resultAnalysis,
            data: this.data
        }
    }

    public constructor(statusCode: number, message: string, resultAnalysis?: ResultAnalysis[], data?: Record<string, any> | string | number) {

        super(message);
        if (data) this.data = data;
        this.resultAnalysis = resultAnalysis ?? [];
        this.statusCode = statusCode;

    }

    public static convertErrorToHttpError(e: Error) {
        if (e instanceof HttpError) return e;

        return new HttpError((e as any).response?.status ?? 500, e.message ?? "Internal Server Error", [], (e as any).response?.data);
    }

}