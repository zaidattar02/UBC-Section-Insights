import {Dataset, IDatasetEntry} from "./Dataset";
import {generateQueryFilterFunction} from "../service/GenerateQueryFilter";
import {InsightDatasetKind, InsightError, ResultTooLargeError, InsightResult} from "../controller/IInsightFacade";
import {createHash} from "crypto";

import {RoomKeyList} from "./Room";
import {CourseSelectionKey, CourseSelectionKeyList} from "./CourseSection";
import {assertTrue} from "../service/Assertions";
import Decimal from "decimal.js";

const utilIsNumber = (v: any) => typeof v === "number";
const utilConvertToDecimal = (v: any) => new Decimal(v);


// we make it partial in order to store shared_properties from grouping
interface QueryEntry {
	entry_properties: Partial<IDatasetEntry>;
	derived_properties: Record<string, number>;
}

export class QueryDataset extends Dataset {
	private query_entries: QueryEntry[];
	private derived_properties_names: string[] = [];

	constructor(d: Dataset) {
		super(d.getID(), d.getKind());
		this.query_entries = d.getEntries().map((e) => ({
			entry_properties: e,
			derived_properties: {}
		}));
	}

	/**
	 * @param WHERE Filter Query Object
	 * @requires this.query_entries.entry_properties to be of type Required<IDatasetEntry>
	 */
	public queryWhere(WHERE: unknown): void {
		// Handle WHERE Clause
		const filterFunction = generateQueryFilterFunction(WHERE, this.kind, this.id);
		const out = this.query_entries.filter((e) => filterFunction(e.entry_properties as IDatasetEntry));
		if (out.length > 5000) {
			throw new ResultTooLargeError("Query returned more than 5000 results");
		}
		this.query_entries = out;
	}

	/**
	 * @param raw_transformation Transformation Query Object
	 * @requires this.query_entries.entry_properties to be of type Required<IDatasetEntry>
	 */
	public queryTransformations(raw_transformation: unknown): void {
		const transformation = this.validateTransformation(raw_transformation);
		const groups = this.makeGroups(transformation.GROUP);
		const applyQuery = this.validateApply(transformation.APPLY);
		this.query_entries = Array.from(groups.entries()).map(([_hash, group]) => {
			let o: QueryEntry = {entry_properties: group.shared_properties, derived_properties: {}};
			for (const {applykey, applytoken, datasetKey} of applyQuery) {
				const values = group.instances.map((i) => i[datasetKey as keyof IDatasetEntry]);
				let decimalValues: Decimal[];
				switch (applytoken) {
					case "MAX":
						assertTrue(values.every(utilIsNumber),
							"MAX must be applied to a key with a numerical value", InsightError);
						decimalValues = values.map(utilConvertToDecimal);
						o.derived_properties[applykey] = Decimal.max(...decimalValues).toNumber();
						break;
					case "MIN":
						assertTrue(values.every(utilIsNumber),
							"MIN must be applied to a key with a numerical value", InsightError);
						decimalValues = values.map(utilConvertToDecimal);
						o.derived_properties[applykey] = Decimal.min(...decimalValues).toNumber();
						break;
					case "AVG":
						assertTrue(values.every(utilIsNumber),
							"AVG must be applied to a key with a numerical value", InsightError);
						decimalValues = values.map(utilConvertToDecimal);
						o.derived_properties[applykey] = Number(decimalValues
							.reduce((a, b) => a.add(b), new Decimal(0))
							.dividedBy(values.length)
							.toFixed(2));
						break;
					case "SUM":
						assertTrue(values.every(utilIsNumber),
							"SUM must be applied to a key with a numerical value", InsightError);
						decimalValues = values.map(utilConvertToDecimal);
						o.derived_properties[applykey] = Number(decimalValues
							.reduce((a, b) => a.add(b), new Decimal(0))
							.toFixed(2)
						);
						break;
					case "COUNT":
						o.derived_properties[applykey] = values.length;
						break;
				}
				this.derived_properties_names.push(applykey);
			}
			return o;
		});
	}

	private makeGroups(GROUP: string[]) {
		// populating groups
		const groups = new Map<string, {shared_properties: Partial<IDatasetEntry>, instances: IDatasetEntry[]}>();
		const UNSAFEtransformationGroupsKeyOnly = GROUP.map((g) => {
			assertTrue((g.match(/_/g) || []).length === 1, "Group key must contain exactly 1 underscore", InsightError);
			const split = g.split("_");
			assertTrue(split[0] === this.id, "Group key must be from the same dataset", InsightError);
			assertTrue(
				(this.kind === InsightDatasetKind.Sections ? CourseSelectionKeyList : RoomKeyList).includes(split[1]),
				"Group key must be a valid key", InsightError);
			return split[1] as keyof IDatasetEntry;
		});
		this.query_entries.forEach((d) => {
			let gp: Partial<IDatasetEntry> = {};
			UNSAFEtransformationGroupsKeyOnly.forEach((g) => gp[g] = d[g]);
			const groupHash = createHash("md5")
				.update(JSON.stringify(Object.values(gp)))
				.digest("hex");
			if (!groups.has(groupHash)) {
				groups.set(groupHash, {shared_properties: gp, instances: [d.entry_properties as IDatasetEntry]});
			} else {
				const cringe = groups.get(groupHash);
				if (cringe !== undefined) {
					cringe.instances.push(d.entry_properties as IDatasetEntry);
				}
			}
		});
		return groups;
	}

	public exportWithOptions(raw_options: unknown): InsightResult[] {
		const options = this.validateOptions(raw_options);
		this.options_filterColumns(options.COLUMNS);

		if (options.ORDER !== undefined) {
			this.options_handleOrdering(options as {COLUMNS: string[]; ORDER: {dir: "UP" | "DOWN"; keys: string[];};});
		}
		return this.query_entries.map((qe) => {
			let out: InsightResult = {};
			Object.entries(qe.entry_properties)
				.forEach(([k, v]) => out[`${this.id}_${k}`] = v as string | number);
			Object.entries(qe.derived_properties)
				.forEach(([k, v]) => out[k] = v);
			return out;
		});
	}

	private options_filterColumns(COLUMNS: string[]): void {
		// Select the columns
		const columnKeys: Array<keyof IDatasetEntry> = [];
		const applyKeys: string[] = [];
		COLUMNS.forEach((col) => {
			const underscoreCount = (col.match(/_/g) || []).length;
			if (underscoreCount === 0) {
				assertTrue(this.derived_properties_names.includes(col),
					`Invalid Key in COLUMNS, "${col}"`, InsightError);
				applyKeys.push(col);
			} else if (underscoreCount === 1) {
				const colParts = col.split("_");
				assertTrue(colParts[0] === this.id &&
					(this.kind === InsightDatasetKind.Sections ? CourseSelectionKeyList : RoomKeyList)
						.includes(colParts[1]),
				`Invalid Key in COLUMNS, "${col}"`, InsightError
				);
				columnKeys.push(colParts[1] as keyof IDatasetEntry);
			} else {
				throw new InsightError("Invalid Key in COLUMNS");
			}
		});

		this.query_entries = this.query_entries.map((s) => {
			const ep: Partial<IDatasetEntry> = {};
			columnKeys.forEach((c) => ep[c] = s.entry_properties[c]);
			const dp: Record<string, number> = {};
			applyKeys.forEach((ak) => dp[ak] = s.derived_properties[ak]);
			return {entry_properties: ep, derived_properties: dp};
		});
	}

	private options_handleOrdering(
		options: {COLUMNS: string[]; ORDER: {dir: "UP" | "DOWN"; keys: string[];} | string;}
	) {
		// Sort the results based on ORDER
		this.query_entries = this.query_entries.sort(typeof options.ORDER === "string"
			? this.stringOrderingFunctionGenerator(options.ORDER as string)
			: this.objectOrderingFunctionGenerator(
				options as {COLUMNS: string[]; ORDER: {dir: "UP" | "DOWN"; keys: string[];};},
				options.ORDER.dir === "UP" ? 1 : -1
			));
	}

	private stringOrderingFunctionGenerator(orderField: string) {
		const field = orderField.split("_")[1] as keyof IDatasetEntry;
		return (a: QueryEntry,b: QueryEntry): number => {
			if (a.entry_properties[field] > b.entry_properties[field]) {
				return 1;
			} else {
				return -1;
			}
		};
	}

	private objectOrderingFunctionGenerator(
		options: {COLUMNS: string[]; ORDER: {dir: "UP" | "DOWN"; keys: string[];};},
		orderingMultiplier: number
	) {
		return (a: QueryEntry,b: QueryEntry): number => {
			for (const orderkey of options.ORDER.keys) {
				const underscoreCount = (orderkey.match(/_/) || []).length;
				if (underscoreCount === 0) {
					assertTrue(this.derived_properties_names.includes(orderkey),
						`Invalid Key "${orderkey}" in ORDER`, InsightError);
					assertTrue(options.COLUMNS.includes(orderkey),
						`ORDER key "${orderkey}" must be in COLUMNS`, InsightError); // additional invariant from EBNF
					const orderField = orderkey;
					assertTrue(a.derived_properties[orderField] !== undefined &&
						b.derived_properties[orderField] !== undefined,
					`ORDER key "${orderkey}" must be in
					${JSON.stringify(a.derived_properties)}, ${JSON.stringify(b.entry_properties)}`, InsightError);
					if (a.derived_properties[orderField] < b.derived_properties[orderField]) {
						return -1 * orderingMultiplier;
					}
					if (a.derived_properties[orderField] > b.derived_properties[orderField]) {
						return 1 * orderingMultiplier;
					}
				} else if (underscoreCount === 1) {
					const splitOrderField = orderkey.split("_");
					assertTrue(splitOrderField[0] === this.id, "Order is referencing the wrong dataset", InsightError);
					assertTrue((this.id === InsightDatasetKind.Sections ? CourseSelectionKeyList : RoomKeyList)
						.includes(splitOrderField[1]),
					`Invalid Key "${orderkey}" in ORDER`, InsightError
					);
					assertTrue(options.COLUMNS.includes(orderkey),
						`ORDER key "${orderkey}" must be in COLUMNS (${options.COLUMNS})`, InsightError); // additional invariant from EBNF
					const orderField = splitOrderField[1] as keyof IDatasetEntry;

					assertTrue(a.entry_properties[orderField] !== undefined &&
						b.entry_properties[orderField] !== undefined,
					`ORDER key "${orderkey}" must be in
					${JSON.stringify(a.entry_properties)}, ${JSON.stringify(b.entry_properties)}`, InsightError);
					if (a.entry_properties[orderField] < b.entry_properties[orderField]) {
						return -1 * orderingMultiplier;
					}
					if (a.entry_properties[orderField] > b.entry_properties[orderField]) {
						return 1 * orderingMultiplier;
					}
				} else {
					throw new InsightError(`Invalid Key "${orderkey}" in ORDER`);
				}
			}
			return -1;
		};
	}

	private validateTransformation(raw_transformation: unknown) {
		assertTrue(typeof raw_transformation === "object" && raw_transformation !== null &&
			Object.keys(raw_transformation).length === 2 &&
			Object.prototype.hasOwnProperty.call(raw_transformation, "GROUP") &&
			Object.prototype.hasOwnProperty.call(raw_transformation, "APPLY"),
		"Transformation in not in the right shape", InsightError);
		const shapedTransformation = raw_transformation as {GROUP: unknown, APPLY: unknown};
		assertTrue(Array.isArray(shapedTransformation.GROUP) && shapedTransformation.GROUP.length > 0 &&
			shapedTransformation.GROUP.every((c) => typeof c === "string"),
		"GROUP should be an array of valid strings", InsightError);
		assertTrue(Array.isArray(shapedTransformation.APPLY), "APPLY must be an array", InsightError);
		return shapedTransformation as {GROUP: string[], APPLY: unknown[]};
	}

	private validateApply(raw_apply: unknown[]) {
		return raw_apply.map((raw_apply_entry) => {
			assertTrue(!(typeof raw_apply_entry === "object" && raw_apply_entry != null &&
				Object.keys(raw_apply_entry).length === 1 && typeof Object.keys(raw_apply_entry)[0] === "string"),
			"Apply Query not Correct Shape", InsightError);
			const applyEntry = raw_apply_entry as Record<string, unknown>;
			const applykey = Object.keys(applyEntry)[0];
			assertTrue(/^[^_]+$/.test(applykey), "", InsightError);

			const inner = applyEntry[applykey];
			assertTrue(typeof inner === "object" && inner != null && Object.keys(inner).length === 1 &&
				typeof Object.keys(inner)[0] === "string", "", InsightError);
			const innerobject = inner as Record<string, unknown>;

			const applytoken = Object.keys(innerobject)[0];
			assertTrue(/^(MAX|MIN|AVG|COUNT|SUM)$/.test(applytoken), "", InsightError);
			const innervalue = innerobject[applytoken] as unknown;
			assertTrue(typeof innervalue === "string", "", InsightError);

			const innerValueString = innervalue as string;
			assertTrue((innerValueString.match(/_/g) || []).length === 1, "", InsightError);
			const [id, key] = innerValueString.split("_");
			assertTrue(id === this.id, "", InsightError);
			assertTrue((this.kind === InsightDatasetKind.Sections ? CourseSelectionKeyList : RoomKeyList).includes(key)
				, "", InsightError);
			return {applykey, applytoken, datasetKey: key};
		});
	}

	private validateOptions(raw_options: unknown) {
		assertTrue(
			typeof raw_options === "object" && raw_options != null &&
			((Object.keys(raw_options).length === 1 && Object.prototype.hasOwnProperty.call(raw_options, "COLUMNS")) ||
				(Object.keys(raw_options).length === 2 &&
					Object.prototype.hasOwnProperty.call(raw_options, "COLUMNS") &&
					Object.prototype.hasOwnProperty.call(raw_options, "ORDER"))),
			"OPTIONS should be an object with two keys, COLUMNS and ORDER", InsightError
		);
		const optionsObj = raw_options as {COLUMNS: unknown; ORDER?: unknown};

		assertTrue(Array.isArray(optionsObj.COLUMNS) && optionsObj.COLUMNS.every((c) => typeof c === "string"),
			"OPTIONS.COLUMNS should be an array of strings", InsightError);
		if (optionsObj.ORDER !== undefined) {
			// assertTrue(Array.isArray(optionsObj.ORDER) && optionsObj.ORDER.every(o=>typeof o === "string"),
			// "OPTIONS.ORDER should be an array of strings", InsightError);
			if(typeof optionsObj.ORDER === "object") {
				assertTrue(optionsObj.ORDER != null &&
					Object.keys(optionsObj.ORDER).length === 2 &&
					Object.prototype.hasOwnProperty.call(optionsObj.ORDER, "dir") &&
					(["UP", "DOWN"].includes((optionsObj.ORDER as any).dir)) &&
					Object.prototype.hasOwnProperty.call(optionsObj.ORDER, "keys") &&
					Array.isArray((optionsObj.ORDER as any).keys) &&
					((optionsObj.ORDER as any).keys as unknown[]).every((k) => typeof k === "string"),
				"ORDER is not in the right shape", InsightError);
			} else if(typeof optionsObj.ORDER === "string") {
				const splitOrderField = optionsObj.ORDER.split("_");
				assertTrue(splitOrderField.length === 2 &&
						splitOrderField[0] === this.id &&
						(this.kind === InsightDatasetKind.Sections ? CourseSelectionKeyList : RoomKeyList)
							.includes(splitOrderField[1]),
				"Invalid Key in ORDER", InsightError);
				assertTrue((optionsObj.COLUMNS as string[]).includes(optionsObj.ORDER),
					"ORDER key must be in COLUMNS", InsightError);
			} else {
				throw new InsightError("ORDER is not in the right shape");
			}
		}
		return optionsObj as {COLUMNS: string[]; ORDER?: {dir: "UP" | "DOWN", keys: string[]}};
	}
}
