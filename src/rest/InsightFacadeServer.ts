import {Request, Response} from "express";
import InsightFacade from "../controller/InsightFacade";
import {
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "../controller/IInsightFacade";
import JSZip from "jszip";
const facade = new InsightFacade();

export class InsightFacadeServer {
	public static async addDataset(req: Request, res: Response) {
		try {
			console.log(`InsightFacadeServer::addDataset(..) - params: ${JSON.stringify(req.params)}`);
			// Check if the request body contains raw data
			if (!req.body || !Buffer.isBuffer(req.body)) {
				res.status(400).json({error: "Request body must contain raw data buffer"});
				return;
			}
			const zipBuffer = req.body;
			const zip = await JSZip.loadAsync(zipBuffer);
			const base64Data = zipBuffer.toString("base64");

			const {id, kind} = req.params;
			const kindValue = InsightFacadeServer.convertToKindEnum(kind);
			await facade
				.addDataset(id, base64Data, kindValue)
				.then((resp: string[]) => {
					const response = {result: resp};
					res.status(200).json({result: response});
				})
				.catch((err: Error) => {
					res.status(400).json({error: err.message});
				});
		} catch (err: any) {
			console.error(err);
			res.status(400).json({error: err.message});
		}
	}

	public static async deleteDataset(req: Request, res: Response) {
		try {
			console.log(`InsightFacadeServer::deleteDataset(..) - params: ${JSON.stringify(req.params)}`);
			const {id} = req.params;
			await facade
				.removeDataset(id)
				.then((resp: string) => {
					const response = {result: resp};
					res.status(200).json({result: response});
				})
				.catch((err: Error) => {
					if (err instanceof NotFoundError) {
						res.status(404).json({error: err.message});
					}
					res.status(400).json({error: err});
				});
		} catch (err: any) {
			res.status(400).json({error: err.message});
		}
	}

	public static async queryDataset(req: Request, res: Response) {
		try {
			console.log(`InsightFacadeServer::queryDataset(..) - params: ${JSON.stringify(req.body)}`);
			const body = req.body;
			await facade
				.performQuery(body)
				.then((resp: InsightResult[]) => {
					const response = {result: resp};
					res.status(200).json({result: response});
				})
				.catch((err: Error) => {
					res.status(400).json({error: err.message});
				});
		} catch (err: any) {
			res.status(400).json({error: err.message});
		}
	}

	public static async getDatasets(req: Request, res: Response) {
		try {
			console.log(`InsightFacadeServer::getDatasets(..) - params: ${JSON.stringify(req.params)}`);
			await facade
				.listDatasets()
				.then((resp: InsightDataset[]) => {
					const response = {result: resp};
					res.status(200).json({result: response});
				})
				.catch((err: Error) => {
					res.status(400).json({error: err.message});
				});
		} catch (err: any) {
			res.status(400).json({error: err.message});
		}
	}

	private static convertToKindEnum(str: string): InsightDatasetKind {
		switch (str.toLocaleLowerCase()) {
			case "rooms":
				return InsightDatasetKind.Rooms;
			case "sections":
				return InsightDatasetKind.Sections;
			default:
				throw new InsightError(`Invalid Dataset Kind = ${str}`);
		}
	}

	public static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = InsightFacadeServer.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
