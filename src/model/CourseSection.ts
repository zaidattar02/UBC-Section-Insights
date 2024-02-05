export interface SectionRaw {
	tier_eighty_five: number;
	tier_ninety:      number;
	Title:            string;
	Section:          string;
	Detail:           string;
	tier_seventy_two: number;
	Other:            number;
	Low:              number;
	tier_sixty_four:  number;
	id:               number;
	tier_sixty_eight: number;
	tier_zero:        number;
	tier_seventy_six: number;
	tier_thirty:      number;
	tier_fifty:       number;
	Professor:        string;
	Audit:            number;
	tier_g_fifty:     number;
	tier_forty:       number;
	Withdrew:         number;
	Year:             string;
	tier_twenty:      number;
	Stddev:           number;
	Enrolled:         number;
	tier_fifty_five:  number;
	tier_eighty:      number;
	tier_sixty:       number;
	tier_ten:         number;
	High:             number;
	Course:           string;
	Session:          string;
	Pass:             number;
	Fail:             number;
	Avg:              number;
	Campus:           string;
	Subject:          string;
}


export interface SectionQuery {
	uuid: string;
	id: string;
	title: string;
	instructor: string;
	dept: string;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
	year: number;
}

export type SectionQueryKeys = keyof SectionQuery;

export type SectionQueryNumericalKeys = "avg" | "pass" | "fail" | "audit" | "year";
export const SectionQueryNumericalKeyList: SectionQueryNumericalKeys[] = ["avg", "pass", "fail", "audit", "year"];

export type SectionQueryStringKeys = "uuid" | "id" | "title" | "instructor" | "dept";
export const SectionQueryStringKeyList: SectionQueryStringKeys[] = ["uuid", "id", "title", "instructor", "dept"];
