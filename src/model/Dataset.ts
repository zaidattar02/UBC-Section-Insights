import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {assertTrue} from "../service/Assertions";
import {CourseSection} from "./CourseSection";
import {Room} from "./Room";

interface CourseSectionDataSet {
	id: string;
	kind: InsightDatasetKind.Sections;
	entries: CourseSection[];
}

interface RoomDataSet {
	id: string;
	kind: InsightDatasetKind.Rooms;
	entries: Room[];
}

export type IDatasetEntry = CourseSection | Room;

export class Dataset {
	protected id: string;
	protected kind: InsightDatasetKind;
	private entries: IDatasetEntry[];

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.entries = [];
	}

	public static fromObject(raw_obj: unknown): Dataset {
		assertTrue(typeof raw_obj === "object" && raw_obj !== null, "Invalid object", InsightError);
		const obj = raw_obj as any;
		assertTrue(typeof obj.id === "string", "Invalid id", InsightError);
		assertTrue(typeof obj.kind === "string" && Object.values(InsightDatasetKind).includes(obj.kind),
			"Invalid kind", InsightError);
		assertTrue(Array.isArray(obj.entries), "Invalid entries", InsightError);
		const validatedObject = obj as {id: string, kind: InsightDatasetKind, entries: unknown[]};

		const dataset = new Dataset(validatedObject.id, validatedObject.kind);
		if (validatedObject.kind === InsightDatasetKind.Rooms) {
			throw new Error("Not implemented");
		} else if (validatedObject.kind === InsightDatasetKind.Sections) {
			validatedObject.entries.forEach((sectionObj: any) => {
				const section = new CourseSection(
					sectionObj.uuid,
					sectionObj.id,
					sectionObj.title,
					sectionObj.instructor,
					sectionObj.dept,
					sectionObj.avg,
					sectionObj.pass,
					sectionObj.fail,
					sectionObj.audit,
					sectionObj.year
				);
				dataset.addEntries(section);
			});
		} else {
			throw new Error("Invalid kind");
		}
		return dataset;
	}

	public getKind() {
		return this.kind;
	}

	public getID() {
		return this.id;
	}

	public isRoom(): this is RoomDataSet {
		return this.kind === InsightDatasetKind.Rooms;
	}

	public isSection(): this is CourseSectionDataSet {
		return this.kind === InsightDatasetKind.Sections;
	}

	public addEntries(section: IDatasetEntry) {
		this.entries.push(section);
	}

	public getEntries(): IDatasetEntry[] {
		return this.entries;
	}
}
