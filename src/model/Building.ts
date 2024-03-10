export class Building{
	public code: string;
	public title: string;
	public address: string;
	public link: string;
	public numberOfRooms:number = 0;

	constructor(
		code: string,
		title: string,
		address: string,
		link: string
	){
		this.code = this.alwaysString(code);
		this.title = this.alwaysString(title);
		this.link = this.alwaysString(link);
		this.address = this.alwaysString(address);
	}

	private alwaysString(value: any): string {
		if (typeof value !== "string") {
			return String(value);
		}
		return value;
	}
}
