type globalDir = {
	expected: string,
	actual: string,
	diff: string | boolean
	output?: string
}

type comparisonResults = {
	match: boolean,
	difference: number,
	diffImage: string,
	diffPixels: number,
	totalPixels: number,
	relevantPixels: number,
	variation: string,
	variations: Array<any>
}