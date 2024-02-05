import {SectionQuery} from "./CourseSection";

//	Interface to define how a dataset should look like
//	Has an array of section objects(container), and an id for the dataset

export interface Dataset{
	id: string;
	section: SectionQuery[]
}
