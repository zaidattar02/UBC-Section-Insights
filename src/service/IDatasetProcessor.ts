import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import {InsightDatasetKind} from "../controller/IInsightFacade";
import {Room} from "../model/Room";

//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

export interface IDatasetProcessor {
	processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset<CourseSection | Room>>;
}
