import {assert} from "console";
import {
	SectionQuery, SectionQueryNumericalKeyList,
	SectionQueryNumericalKeys, SectionQueryStringKeyList, SectionQueryStringKeys
} from "../model/CourseSection";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.reject("Not implemented.");
	}

	public async removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	private static isLogicalComparison(key: string): boolean {
		return key === "AND" || key === "OR" || key === "NOT";
	}

	private static isMComparison(key: string): boolean {
		return key === "GT" || key === "LT" || key === "EQ";
	}

	private static isSComparison(key: string): boolean {
		return key === "IS";
	}

	private static generateQueryFunction(filter: unknown, unifiedDatasetName: string):
		(section: SectionQuery) => boolean {
		assert(typeof filter === "object", "Filter object should be an object");
		const filterobj: object = filter as object;
		assert(Object.keys(filterobj).length === 1, "Filter object should only have one key"); // throw an error later
		const rootFilterObjKey = Object.keys(filterobj)[0];

		const innerVal: unknown = (filterobj as {[key: string]: unknown})[rootFilterObjKey];
		// Comparisons
		if(InsightFacade.isMComparison(rootFilterObjKey) || InsightFacade.isSComparison(rootFilterObjKey)) {
			assert(typeof innerVal === "object", "Inner object of GT should be an object");
			const innerObj = innerVal as object;
			const innerObjKVs = Object.entries(innerObj);
			assert(innerObjKVs.length === 1, "Inner object of GT should only have one key");
			const [dataKeyFull, dataVal] = innerObjKVs[0];

			const splitDataKeyFull = dataKeyFull.split("_");
			assert(
				splitDataKeyFull.length === 2,
				"Key of inner object of GT should be in the form of 'key'_'value'" + dataKeyFull
			);
			const [dataSetName, dataKey] = splitDataKeyFull;
			assert(dataSetName === unifiedDatasetName, "Must only query one dataset");

			// MCOMPARISON
			if(InsightFacade.isMComparison(rootFilterObjKey)) {
				assert(dataKey in SectionQueryNumericalKeyList, "Key of inner object of GT should be a valid key");
				const dataKeyNumerical = dataKey as SectionQueryNumericalKeys;
				assert(typeof dataVal === "number", "Key of inner object of GT should be a string");
				const dataValNum = dataVal as number;

				switch(rootFilterObjKey) {
					case "GT":
						return (section: SectionQuery) => {
							return section[dataKeyNumerical] > dataValNum;
						};
					case "LT":
						return (section: SectionQuery) => {
							return section[dataKeyNumerical] < dataValNum;
						};
					case "EQ":
						return (section: SectionQuery) => {
							return section[dataKeyNumerical] === dataValNum;
						};
					default:
						throw new SyntaxError("Code should be unreachable.");
				}
			} else if(InsightFacade.isSComparison(rootFilterObjKey)) { // SCOMPARISON
				assert(dataKey in SectionQueryStringKeyList, "Key of inner object of GT should be a valid key");
				const dataKeyString = dataKey as SectionQueryStringKeys;
				assert(typeof dataVal === "string", "Key of inner object of GT should be a string");
				const dataValStr = dataVal as string;
				return (section: SectionQuery) => {
					return section[dataKeyString].includes(dataValStr);
				};
			}
		}

		// LOGICCOMPARISON
		if(InsightFacade.isLogicalComparison(rootFilterObjKey)) {
			assert(typeof innerVal === "object" && Array.isArray(innerVal), "Inner object of AND should be an array");
			const innerArray = innerVal as unknown[];
			const innerArrayFuncs = innerArray.map(
				(filterElement) => InsightFacade.generateQueryFunction(filterElement, unifiedDatasetName));
			switch (rootFilterObjKey) {
				case "AND":
					return (section: SectionQuery) => {
						return innerArrayFuncs.every((f) => f(section));
					};
				case "OR":
					return (section: SectionQuery) => {
						return innerArrayFuncs.some((f) => f(section));
					};
				default:
					throw new SyntaxError("Code should be unreachable.");
			}
		}

		// negation
		if (rootFilterObjKey === "NOT") {
			const f = InsightFacade.generateQueryFunction(innerVal, unifiedDatasetName);
			return (section: SectionQuery) => {
				return !f(section);
			};
		}

		throw new InsightError("Invalid Query Command");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// validation that query is valid (everything except WHERE clause)
		const validQuery = query as {WHERE: object};
		// load data from disk (hopefully it has already been parsed by addDataset)
		const allSections: SectionQuery[] = [];
		// generation of the filter function
		const datasetName = "courses";
		const queryFilterFunc = InsightFacade.generateQueryFunction(validQuery.WHERE, datasetName);
		const filteredSections = allSections.filter(queryFilterFunc); // apply filter function
		// apply options
		// return final result
		return Promise.reject("Not implemented.");
	}

	public handleOptions(options: unknown, datasetName: string, unprocessedResults: InsightResult[]): InsightResult[] {
		this.assertTrue(typeof options === "object", "OPTIONS should be an object",SyntaxError);

		let optionsObj: { [key: string]: object } = options as { [key: string]: object };

		this.assertTrue(Object.keys(optionsObj).length === 2, "OPTIONS object should only have two keys",SyntaxError);

		this.assertTrue(
			Object.prototype.hasOwnProperty.call(optionsObj, "COLUMNS") &&
				Object.prototype.hasOwnProperty.call(optionsObj, "ORDER"),
			"OPTIONS object should only have two keys",SyntaxError
		);

		this.assertTrue(typeof optionsObj.ORDER === "string", "OPTIONS.ORDER should only be a string",SyntaxError);

		this.assertTrue(
			Array.isArray(optionsObj.COLUMNS) && optionsObj.COLUMNS.every((column: any) => typeof column === "string"),
			"OPTIONS.COLUMNS will be an array of strings only",SyntaxError
		  );
		// TODO : Validate Keys format in COLUMNS Object
		// TODO : Validate Key in ORDER Object
		// TODO : Return Data
		return unprocessedResults;
	}

	private assertTrue(condition: boolean, msg: string,ErrorType: new (message?: string) => Error) {
		this.throwErrorOnAssertion(true,condition,msg,ErrorType);
	}

	private assertFalse(condition: boolean, msg: string,ErrorType: new (message?: string) => Error) {
		this.throwErrorOnAssertion(false,condition,msg,ErrorType);
	}

	private throwErrorOnAssertion(assertion: boolean,condition: boolean, msg: string,
		ErrorType: new (message?: string) => Error) {
		if (assertion !== condition) {
			const error = new ErrorType(msg);
			error.message = msg;
			throw error;
		}
	}


	public async listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
