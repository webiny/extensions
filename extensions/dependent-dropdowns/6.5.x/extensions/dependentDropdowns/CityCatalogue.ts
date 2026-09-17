import { makeAutoObservable, runInAction } from "mobx";

export interface CityOption {
    label: string;
    value: string;
}

/**
 * Stands in for wherever the cities really come from: your own API route, a third-party
 * service, another CMS model. The only thing that matters for the form is that the
 * result lives in observable state, so the dropdown repaints when it lands.
 */
const fetchCities = async (): Promise<Record<string, CityOption[]>> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
        hr: [
            { label: "Zagreb", value: "zagreb" },
            { label: "Split", value: "split" },
            { label: "Rijeka", value: "rijeka" }
        ],
        de: [
            { label: "Berlin", value: "berlin" },
            { label: "Hamburg", value: "hamburg" },
            { label: "Munich", value: "munich" }
        ],
        uk: [
            { label: "London", value: "london" },
            { label: "Manchester", value: "manchester" },
            { label: "Bristol", value: "bristol" }
        ]
    };
};

export class CityCatalogue {
    private cities: Record<string, CityOption[]> = {};
    private loading = false;
    private loaded = false;

    constructor() {
        makeAutoObservable(this);
    }

    get isLoaded(): boolean {
        return this.loaded;
    }

    forCountry(country: unknown): CityOption[] {
        return this.cities[String(country ?? "")] ?? [];
    }

    async load(): Promise<void> {
        if (this.loading || this.loaded) {
            return;
        }
        this.loading = true;

        const cities = await fetchCities();

        runInAction(() => {
            this.cities = cities;
            this.loading = false;
            this.loaded = true;
        });
    }
}
