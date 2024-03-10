import {Dataset} from "../model/Dataset";
import { SectionsDatasetProcessor } from "./SectionsDatasetProcessor";
import { RoomsDatasetProcessor } from "./RoomsDatasetProcessor";
import { InsightDatasetKind } from "../controller/IInsightFacade";

export class DatasetProcessor {
	public static async processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset>{
		if(kind == InsightDatasetKind.Sections){
			return new SectionsDatasetProcessor().processDataset(id,content,kind);
		}else{
			return new RoomsDatasetProcessor().processDataset(id,content,kind);
		}
	}
}
