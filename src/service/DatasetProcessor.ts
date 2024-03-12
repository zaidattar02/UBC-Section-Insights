import {Dataset} from "../model/Dataset";
import {SectionsDatasetProcessor} from "./SectionsDatasetProcessor";
import {RoomsDatasetProcessor} from "./RoomsDatasetProcessor";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {CourseSection} from "../model/CourseSection";
import {Room} from "../model/Room";

export class DatasetProcessor {
	public static async processDataset(
		id: string,
		content: string,
		kind: InsightDatasetKind
	): Promise<Dataset<Room | CourseSection>> {
		if (kind === InsightDatasetKind.Sections) {
			const dsp = new SectionsDatasetProcessor();
			return dsp.processDataset(id, content, kind);
		} else if (kind === InsightDatasetKind.Rooms) {
			const dsp = new RoomsDatasetProcessor();
			return dsp.processDataset(id, content, kind);
		} else {
			throw new InsightError(`Invalid Dataset Kind = ${kind}`);
		}
	}
}
