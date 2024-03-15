import {Dataset} from "./Dataset";
import {generateQueryFilterFunction} from "../service/GenerateQueryFilter";
import {InsightDatasetKind, InsightError, ResultTooLargeError, InsightResult} from "../controller/IInsightFacade";
import {createHash} from "crypto";

import {RoomKeyList} from "./Room";
import {CourseSelectionKeyList} from "./CourseSection";
import {assertTrue, assertType} from "../service/Assertions";
import Decimal from "decimal.js";

const utilIsNumber = (v: any) => typeof v === "number";
const utilConvertToDecimal = (v: any) => new Decimal(v);

interface QueryEntry<DatasetEntry> {
	dataProperties: Partial<DatasetEntry>;
	derivedProperties: Record<string, number>;
}

type OrderSchema<T> = Array<{type: "data_prop", key: keyof T} | {type: "derived_prop", key: string}>;

/**
 * @param T The type of the dataset
 */
export class QueryDataset<DatasetEntry extends object> extends Dataset<DatasetEntry> {
	// we make it partial in order to store shared_properties from grouping
	private query_entries: Array<QueryEntry<DatasetEntry>>;
	private derived_properties_names: string[] = [];

	constructor(d: Dataset<DatasetEntry>) {
		super(d.getID(), d.getKind());
		this.query_entries = d.getEntries().map((e) => ({
			dataProperties: e,
			derivedProperties: {}
		}));
	}

	/**
	 * @param WHERE Filter Query Object
	 * @requires this.query_entries.dataProperties to be of type Required<IDatasetEntry>
	 */
	public queryWhere(WHERE: unknown): void {
		// Handle WHERE Clause
		const filterFunction = generateQueryFilterFunction<DatasetEntry>(WHERE, this.kind, this.id);
		const out = this.query_entries.filter((e) => filterFunction(e.dataProperties as DatasetEntry));
		this.query_entries = out;
	}

	/**
	 * @param raw_transformation Transformation Query Object
	 * @requires this.query_entries.dataProperties to be of type Required<IDatasetEntry>
	 * @requires raw_transformations not to be undefined
	 */
	public queryTransformations(raw_transformation: unknown): void {
		// validate queries
		const transformation = this.validateTransformationShape(raw_transformation);
		const groupKeys = this.validateGroup(transformation.GROUP);
		const applyProps = this.validateApply(transformation.APPLY);

		const groups = this.makeGroups(groupKeys);
		this.query_entries = Array.from(groups.entries()).map(([_hash, group]) => {
			let o: QueryEntry<DatasetEntry> = {dataProperties: group.shared_properties, derivedProperties: {}};
			for (const {applykey, applytoken, datasetKey} of applyProps) {
				const values = group.instances.map((i) => i[datasetKey]);
				switch (applytoken) {
					case "MAX":
						assertTrue(values.every(utilIsNumber),
							"MAX must be applied to a key with a numerical value", InsightError);
						o.derivedProperties[applykey] = Decimal.max(...values.map(utilConvertToDecimal)).toNumber();
						break;
					case "MIN":
						assertTrue(values.every(utilIsNumber),
							"MIN must be applied to a key with a numerical value", InsightError);
						o.derivedProperties[applykey] = Decimal.min(...values.map(utilConvertToDecimal)).toNumber();
						break;
					case "AVG":
						assertTrue(values.every(utilIsNumber),
							"AVG must be applied to a key with a numerical value", InsightError);
						o.derivedProperties[applykey] = Number((Number(values.map(utilConvertToDecimal)
							.reduce((a, b) => a.add(b), new Decimal(0))) / values.length).toFixed(2));
						break;
					case "SUM":
						assertTrue(values.every(utilIsNumber),
							"SUM must be applied to a key with a numerical value", InsightError);
						o.derivedProperties[applykey] = Number(values.map(utilConvertToDecimal)
							.reduce((a, b) => a.add(b), new Decimal(0))
							.toFixed(2)
						);
						break;
					case "COUNT":
						o.derivedProperties[applykey] = (new Set(values)).size;
						break;
				}
				this.derived_properties_names.push(applykey);
			}
			return o;
		});
	}

	/**
	 * @requires this.query_entries[0].dataProperties to be of type Required<DatasetEntry>
	 * @param GROUP List of keys to group by
	 * @returns A map of groups, with the key being the hash of the group and the value being the group
	 */
	private makeGroups(GROUP: Array<keyof DatasetEntry>) {
		// populating groups
		const groups = new Map<string, {shared_properties: Partial<DatasetEntry>, instances: DatasetEntry[]}>();
		this.query_entries.forEach((query_entry) => {
			let gp: Partial<DatasetEntry> = {};
			GROUP.forEach((g) => {
				gp[g] = query_entry.dataProperties[g];
			});
			const groupHash = createHash("md5")
				.update(JSON.stringify(Object.values(gp)))
				.digest("hex");
			if (!groups.has(groupHash)) {
				groups.set(groupHash, {
					shared_properties: gp,
					instances: [query_entry.dataProperties as DatasetEntry]
				});
			} else {
				const cringe = groups.get(groupHash);
				if (cringe !== undefined) {
					cringe.instances.push(query_entry.dataProperties as DatasetEntry);
				}
			}
		});
		return groups;
	}

	public exportWithOptions(raw_options: unknown): InsightResult[] {
		if (this.query_entries.length > 5000) {
			throw new ResultTooLargeError("Query returned more than 5000 results");
		}
		const {COLUMNS, ORDER} = this.validateOptionShape(raw_options);

		assertType<string[]>(COLUMNS, Array.isArray(COLUMNS) && COLUMNS.every((c) => typeof c === "string"),
			"OPTIONS.COLUMNS should be an array of strings", InsightError);
		this.optionsFilterColumns(COLUMNS);
		if (ORDER !== undefined) {
			this.optionsHandleOrdering(COLUMNS, ORDER);
		}
		return this.query_entries.map((qe) => {
			let out: InsightResult = {};
			Object.entries(qe.dataProperties)
				// TODO fix not knowing what the value is.
				.forEach(([k, v]) => out[`${this.id}_${k}`] = v as string | number);
			Object.entries(qe.derivedProperties)
				.forEach(([k, v]) => out[k] = v);
			return out;
		});
	}

	private optionsFilterColumns(COLUMNS: string[]): void {
		// Select the columns
		const columnKeys: Array<keyof DatasetEntry> = [];
		const applyKeys: string[] = [];
		COLUMNS.forEach((col) => {
			const underscoreCount = (col.match(/_/g) || []).length;
			if (underscoreCount === 0) {
				assertTrue(this.derived_properties_names.includes(col),
					`Invalid Key in COLUMNS, "${col}"`, InsightError);
				applyKeys.push(col);
			} else if (underscoreCount === 1) {
				const [datasetId, key] = col.split("_");
				assertTrue(datasetId === this.id, `Invalid Key in COLUMNS, "${col}"`, InsightError);
				this.validateKey(key, `Invalid Key in COLUMNS, "${col}"`);
				columnKeys.push(key);
			} else {
				throw new InsightError("Invalid Key in COLUMNS");
			}
		});

		this.query_entries = this.query_entries.map((s) => {
			const ep: Partial<DatasetEntry> = {};
			columnKeys.forEach((c) => ep[c] = s.dataProperties[c]);
			const dp: Record<string, number> = {};
			applyKeys.forEach((ak) => dp[ak] = s.derivedProperties[ak]);
			return {dataProperties: ep, derivedProperties: dp};
		});
	}

	/**
	 * @param COLUMNS COLUMNS Query Object
	 * @param ORDER ORDERING Query Object
	 * @requires this.query_entries[0].dataProperties to be of type Required<DatasetEntry>
	 */
	private optionsHandleOrdering( COLUMNS: string[], ORDER: unknown ) {
		if(typeof ORDER === "string") {
			assertTrue((ORDER.match(/_/) || []).length === 1, "Invalid Key in ORDER", InsightError);
			const [datasetID, key] = ORDER.split("_");
			assertTrue(datasetID === this.id, "Invalid Key in ORDER", InsightError);
			this.validateKey(key, "Invalid Key in ORDER");
			assertTrue(COLUMNS.includes(ORDER), "ORDER key must be in COLUMNS", InsightError);
			this.query_entries = this.query_entries.sort(this.stringOrderingFunctionGenerator(key));
		} else if(typeof ORDER === "object") {
			assertType<{dir: unknown, keys: unknown}>(ORDER, ORDER != null && Object.keys(ORDER).length === 2 &&
				Object.prototype.hasOwnProperty.call(ORDER, "dir") &&
				Object.prototype.hasOwnProperty.call(ORDER, "keys"),
			"ORDER is not in the right shape", InsightError);
			assertType<"UP" | "DOWN">(ORDER.dir, typeof ORDER.dir === "string" && ["UP", "DOWN"].includes(ORDER.dir),
				"ORDER.dir is not the right shape", InsightError);
			assertType<string[]>(ORDER.keys, Array.isArray(ORDER.keys) && ORDER.keys.length > 0 &&
				ORDER.keys.every((k) => typeof k === "string"),
			"ORDER.keys is not the right shape", InsightError);
			const orderSchema: OrderSchema<DatasetEntry> = ORDER.keys.map((orderkey) => {
				const underscoreCount = (orderkey.match(/_/) || []).length;
				if (underscoreCount === 0) {
					assertTrue(this.derived_properties_names.includes(orderkey),
						`Invalid Key "${orderkey}" in ORDER`, InsightError);
					assertTrue(COLUMNS.includes(orderkey),
						`ORDER key "${orderkey}" must be in COLUMNS`, InsightError); // additional invariant from EBNF
					return {type: "derived_prop", key: orderkey};
				} else if (underscoreCount === 1) {
					const [datasetID, key] = orderkey.split("_");
					assertTrue(datasetID === this.id, "Order is referencing the wrong dataset", InsightError);
					this.validateKey(key, `Invalid Key "${orderkey}" in ORDER`);
					assertTrue(COLUMNS.includes(orderkey),
						`ORDER key "${orderkey}" must be in COLUMNS (${COLUMNS})`, InsightError); // additional invariant from EBNF
					return {type: "data_prop", key};
				} else {
					throw new InsightError(`Invalid Key "${orderkey}" in ORDER`);
				}
			});
			this.query_entries = this.query_entries.sort(this.objectOrderingFunctionGenerator(orderSchema,
				ORDER.dir === "UP" ? 1 : -1));
		} else {
			throw new InsightError("ORDER is not in the right shape");
		}
	}

	private stringOrderingFunctionGenerator(orderField: keyof DatasetEntry) {
		return (a: QueryEntry<DatasetEntry>,b: QueryEntry<DatasetEntry>): number =>
			(a.dataProperties as DatasetEntry)[orderField] > (b.dataProperties as DatasetEntry)[orderField]
				? 1 :
				(a.dataProperties as DatasetEntry)[orderField] < (b.dataProperties as DatasetEntry)[orderField]
					? -1
					: 0;
	}

	private objectOrderingFunctionGenerator(
		orderSchema: OrderSchema<DatasetEntry>,
		orderingMultiplier: number
	) {
		return (a: QueryEntry<DatasetEntry>,b: QueryEntry<DatasetEntry>): number => {
			for (const orderkey of orderSchema) {
				if(orderkey.type === "data_prop"){
					if ((a.dataProperties as DatasetEntry)[orderkey.key] <
						(b.dataProperties as DatasetEntry)[orderkey.key]) {
						return -1 * orderingMultiplier;
					}
					if ((a.dataProperties as DatasetEntry)[orderkey.key] >
						(b.dataProperties as DatasetEntry)[orderkey.key]) {
						return 1 * orderingMultiplier;
					}
				} else if(orderkey.type === "derived_prop") {
					if (a.derivedProperties[orderkey.key] < b.derivedProperties[orderkey.key]) {
						return -1 * orderingMultiplier;
					}
					if (a.derivedProperties[orderkey.key] > b.derivedProperties[orderkey.key]) {
						return 1 * orderingMultiplier;
					}
				}
			}
			return 0;
		};
	}

	// VALIDATIONS
	private validateKey(k: unknown, msg: string): asserts k is keyof DatasetEntry {
		if(typeof k !== "string") {
			throw new InsightError("Key must be a string");
		}
		assertTrue((this.kind === InsightDatasetKind.Sections ? CourseSelectionKeyList : RoomKeyList)
			.includes(k), msg, InsightError);
	}

	/**
	 * @param raw_groups The raw unknown GROUP object
	 * @returns the keys which are to be grouped
	 */
	private validateGroup(raw_groups: unknown): Array<keyof DatasetEntry> {
		assertTrue(Array.isArray(raw_groups) && raw_groups.length > 0 && raw_groups.every((g) => typeof g === "string"),
			"GROUP should be an array of valid strings, of length at least 1", InsightError);
		const stringGroup = raw_groups as string[];
		return stringGroup.map((g)=>{
			assertTrue((g.match(/_/g) || []).length === 1, "Group key must contain exactly 1 underscore", InsightError);
			const [datasetID, key] = g.split("_");
			assertTrue(datasetID === this.id, `Group ${g} references variables from a different dataset`, InsightError);
			this.validateKey(key, `Group ${g} references an invalid key for DatasetKind ${this.kind}`);
			return key;
		});
	}

	/**
	 * @param raw_transformation The raw unknown transformation object
	 * @returns A shaped transformation object, with GROUP valid
	 */
	private validateTransformationShape(raw_transformation: unknown) {
		assertType<{GROUP: unknown, APPLY: unknown}>(raw_transformation,
			typeof raw_transformation === "object" && raw_transformation !== null &&
			Object.keys(raw_transformation).length === 2 &&
			Object.prototype.hasOwnProperty.call(raw_transformation, "GROUP") &&
			Object.prototype.hasOwnProperty.call(raw_transformation, "APPLY"),
			"Transformation in not in the right shape", InsightError);
		return raw_transformation;
	}

	private validateApply(raw_apply: unknown) {
		assertType<unknown[]>(raw_apply, Array.isArray(raw_apply), "APPLY must be an array", InsightError);
		return raw_apply.map((raw_apply_entry) => {
			assertTrue(typeof raw_apply_entry === "object" && raw_apply_entry != null &&
				Object.keys(raw_apply_entry).length === 1 && typeof Object.keys(raw_apply_entry)[0] === "string",
			"Apply Query not Correct Shape", InsightError);
			const applyEntry = raw_apply_entry as Record<string, unknown>;
			const applykey = Object.keys(applyEntry)[0];
			assertTrue(/^[^_]+$/.test(applykey), "Apply Key in Wrong Form", InsightError);

			const inner = applyEntry[applykey];
			assertTrue(typeof inner === "object" && inner != null && Object.keys(inner).length === 1 &&
				typeof Object.keys(inner)[0] === "string", "Aggregation Query Inner Value not Valid", InsightError);
			const innerobject = inner as Record<string, unknown>;

			const applytoken = Object.keys(innerobject)[0];
			assertType<"MAX" | "MIN" | "AVG" | "COUNT" | "SUM">(applytoken,
				/^(MAX|MIN|AVG|COUNT|SUM)$/.test(applytoken), "Apply Token not valid", InsightError);
			const ivDSKey = innerobject[applytoken] as unknown;
			assertType<string>(ivDSKey, typeof ivDSKey === "string", "Dataset Key not a string", InsightError);
			assertTrue((ivDSKey.match(/_/g) || []).length === 1, "Dataset Key Not Valid", InsightError);
			const [id, datasetKey] = ivDSKey.split("_");
			assertTrue(id === this.id, "Disagreement on Aggregation Dataset ID", InsightError);
			this.validateKey(datasetKey, `Apply ${applykey} references an invalid key for DatasetKind ${this.kind}`);
			return {applykey, applytoken, datasetKey};
		});
	}

	private validateOptionShape(raw_options: unknown) {
		assertType<{COLUMNS: unknown; ORDER?: unknown}>(raw_options,
			typeof raw_options === "object" && raw_options != null &&
			((Object.keys(raw_options).length === 1 && Object.prototype.hasOwnProperty.call(raw_options, "COLUMNS")) ||
				(Object.keys(raw_options).length === 2 &&
					Object.prototype.hasOwnProperty.call(raw_options, "COLUMNS") &&
					Object.prototype.hasOwnProperty.call(raw_options, "ORDER"))),
			"OPTIONS should be an object with two keys, COLUMNS and ORDER", InsightError
		);
		return raw_options;
	}
}
