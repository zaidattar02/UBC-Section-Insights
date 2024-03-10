import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import * as parse5 from "parse5";
import {Building} from "../model/Building";
import {Room} from "../model/Room";
import{fetchData} from"./HttpService";

//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

export interface IDatasetProcessor {
	processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset>;
}
