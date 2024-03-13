import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {CourseSectionNumericalKeyList, CourseSectionStringKeyList} from "../model/CourseSection";
import {RoomNumericalKeyList, RoomStringKeyList} from "../model/Room";
import {assertTrue} from "./Assertions";

function isLogicalComparison(key: string): key is "AND" | "OR" {
	return key === "AND" || key === "OR";
}

function isMComparison(key: string): key is "GT" | "LT" | "EQ" {
	return key === "GT" || key === "LT" || key === "EQ";
}

function isSComparison(key: string): key is "IS" {
	return key === "IS";
}

function handle_m_comparison<IDatasetEntry>(
	dataKey: string, dataVal: unknown, datasetType: InsightDatasetKind, filterKey: string
): (section: IDatasetEntry) => boolean{
	assertTrue(typeof dataVal === "number", "Key of inner object of Comparison should be a string", InsightError);
	const dataValNum = dataVal as number;

	assertTrue(
		(datasetType === InsightDatasetKind.Sections
			? CourseSectionNumericalKeyList
			: RoomNumericalKeyList).includes(dataKey),
		`Key of inner object of Comparison should be a valid key, is of key "${dataKey}"`,
		InsightError
	);
	const dataKeyNumerical = dataKey as keyof IDatasetEntry;

	switch (filterKey) {
		case "GT":
			return (section: IDatasetEntry) => (section[dataKeyNumerical] as number) > dataValNum;
		case "LT":
			return (section: IDatasetEntry) => (section[dataKeyNumerical] as number) < dataValNum;
		case "EQ":
			return (section: IDatasetEntry) => (section[dataKeyNumerical] as number) === dataValNum;
		default:
			throw new SyntaxError("Code should be unreachable: Invalid MComparison Key");
	}
}

function handle_s_comparison<IDatasetEntry>(
	dataKey: string, dataVal: unknown, datasetType: InsightDatasetKind, _: string
): (section: IDatasetEntry) => boolean {
	assertTrue(typeof dataVal === "string", "Key of inner object of Comparison should be a string", InsightError);
	const dataValStr = dataVal as string;

	const isFrontWildcard = dataValStr.startsWith("*"),
		isEndWildcard = dataValStr.endsWith("*");
	let dataValStrNoWildcards: string;
	if (isFrontWildcard && isEndWildcard) {
		dataValStrNoWildcards = dataValStr.slice(1, -1);
	} else if (isFrontWildcard) {
		dataValStrNoWildcards = dataValStr.slice(1);
	} else if (isEndWildcard) {
		dataValStrNoWildcards = dataValStr.slice(0, -1);
	} else {
		dataValStrNoWildcards = dataValStr;
	}
	assertTrue(dataValStrNoWildcards.includes("*") === false, "Invalid wildcard placement", InsightError);

	assertTrue(
		(datasetType === InsightDatasetKind.Sections ? CourseSectionStringKeyList : RoomStringKeyList)
			.includes(dataKey),
		"Key of inner object of Comparison should be a valid key",
		InsightError
	);
	const dataKeyString = dataKey as keyof IDatasetEntry;
	if (isFrontWildcard && isEndWildcard) {
		return (section: IDatasetEntry) => (section[dataKeyString] as string).includes(dataValStrNoWildcards);
	} else if (isFrontWildcard) {
		return (section: IDatasetEntry) => (section[dataKeyString] as string).endsWith(dataValStrNoWildcards);
	} else if (isEndWildcard) {
		return (section: IDatasetEntry) => (section[dataKeyString] as string).startsWith(dataValStrNoWildcards);
	} else {
		return (section: IDatasetEntry) => (section[dataKeyString] as string) === dataValStr;
	}
}

function handle_comparison<T>(
	innerVal: unknown,
	unifiedDatasetName: string,
	datasetType: InsightDatasetKind,
	rootFilterObjKey: string
): (section: T) => boolean {
	assertTrue(typeof innerVal === "object", "Inner object of Comparison should be an object", InsightError);
	const innerObj = innerVal as object;
	const innerObjKVs: Array<[string, unknown]> = Object.entries(innerObj);
	assertTrue(innerObjKVs.length === 1, "Inner object of Comparison should only have one key", InsightError);
	const [dataKeyFull, dataVal] = innerObjKVs[0];

	const splitDataKeyFull = dataKeyFull.split("_");
	assertTrue(
		splitDataKeyFull.length === 2,
		"Key of inner object of Comparison should be in the form of 'key'_'value'" + dataKeyFull,
		InsightError
	);
	const [dataSetName, dataKey] = splitDataKeyFull;
	assertTrue(dataSetName === unifiedDatasetName, "Must only query one dataset", InsightError);

	// MCOMPARISON
	if (isMComparison(rootFilterObjKey)) {
		return handle_m_comparison(dataKey, dataVal, datasetType, rootFilterObjKey);
	} else if (isSComparison(rootFilterObjKey)) {
		// SCOMPARISON
		return handle_s_comparison(dataKey, dataVal, datasetType, rootFilterObjKey);
	}
	throw new SyntaxError(`Code should be unreachable: Invalid Comparison Key, ${rootFilterObjKey}`);
}

export function generateQueryFilterFunction<IDatasetEntry>(
	WHERE: unknown,
	datasetType: InsightDatasetKind,
	unifiedDatasetName: string
): (section: IDatasetEntry) => boolean {
	assertTrue(typeof WHERE === "object", "Filter object should be an object", InsightError);
	const filterobj: object = WHERE as object;

	if (Object.keys(filterobj).length === 0) {
		return () => true;
	}

	assertTrue(Object.keys(filterobj).length === 1, "Filter object should only have at most one key", InsightError); // throw an error later
	const rootFilterObjKey = Object.keys(filterobj)[0];
	const innerVal: unknown = (filterobj as {[key: string]: unknown})[rootFilterObjKey];
	// Comparisons
	if (isMComparison(rootFilterObjKey) || isSComparison(rootFilterObjKey)) {
		return handle_comparison(innerVal, unifiedDatasetName, datasetType, rootFilterObjKey);
	}

	// LOGICCOMPARISON
	if (isLogicalComparison(rootFilterObjKey)) {
		assertTrue(
			typeof innerVal === "object" && Array.isArray(innerVal),
			"Inner object of AND should be an array",
			InsightError
		);
		const innerArray = innerVal as unknown[];
		const innerArrayFuncs = innerArray.map((filterElement) =>
			generateQueryFilterFunction(filterElement, datasetType, unifiedDatasetName)
		);
		switch (rootFilterObjKey) {
			case "AND":
				return (section: IDatasetEntry) => innerArrayFuncs.every((f) => f(section));
			case "OR":
				return (section: IDatasetEntry) => innerArrayFuncs.some((f) => f(section));
		}
	}

	// negation
	if (rootFilterObjKey === "NOT") {
		const f = generateQueryFilterFunction(innerVal, datasetType, unifiedDatasetName);
		return (section: IDatasetEntry) => !f(section);
	}

	throw new InsightError("Invalid Query Command");
}
