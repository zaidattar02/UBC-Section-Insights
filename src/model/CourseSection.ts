import {alwaysNumber, alwaysString} from "../service/Sanitization";
import {IDatasetEntry} from "./Dataset";

export interface CourseSection extends IDatasetEntry {
	uuid: string
	id: string
	title: string
	instructor: string
	dept: string
	avg: number
	pass: number
	fail: number
	audit: number
	year: number
}

export function createCourseSection(
	uuid: string,
	id: string,
	title: string,
	instructor: string,
	dept: string,
	avg: number,
	pass: number,
	fail: number,
	audit: number,
	year: number,
): CourseSection {
	return {
		uuid: alwaysString(uuid),
		id: alwaysString(id),
		title: alwaysString(title),
		instructor: alwaysString(instructor),
		dept: alwaysString(dept),
		avg: alwaysNumber(avg),
		pass: alwaysNumber(pass),
		fail: alwaysNumber(fail),
		audit: alwaysNumber(audit),
		year: alwaysNumber(year),
	};
}

export type CourseSectionNumericalKeys = "avg" | "pass" | "fail" | "audit" | "year";
export const CourseSectionNumericalKeyList: string[] = ["avg", "pass", "fail", "audit", "year"];

export type CourseSectionStringKeys = "uuid" | "id" | "title" | "instructor" | "dept";
export const CourseSectionStringKeyList: string[] = ["uuid", "id", "title", "instructor", "dept"];

export type CourseSelectionKey = CourseSectionNumericalKeys | CourseSectionStringKeys;
export const CourseSelectionKeyList: string[] = [...CourseSectionNumericalKeyList, ...CourseSectionStringKeyList];

