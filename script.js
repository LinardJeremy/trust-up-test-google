
class GoogleAutocomplete {

    constructor(config = {types: ['(regions)']})
    {
        this.config = config;
        this.results = [];
        this.autocomplete = new google.maps.places.AutocompleteService();
    }
    
    search(query = '', withDetails = false)
    {
        console.log('Searching...', query, this.autocomplete);
        return new Promise((resolve, reject) => {
            console.log(query);
            if ( query == '' ) {
                return resolve([]);
            }

            this.autocomplete.getPlacePredictions({
                input: query,
                types: ['(regions)'],
                language: 'fr',
                componentRestrictions: { country: 'be' }
            }, (predictions, status) => {
                console.log(predictions, status);
                if (status != google.maps.places.PlacesServiceStatus.OK) {
                    console.error('No results found:', status);
                    return reject();
                }

                predictions = predictions.map(data => new Prediction(data));
                return resolve(predictions);
            });
        });
    }

};

class Prediction
{
    constructor(data = {})
    {
        for (const [key, value] of Object.entries(data)) {
            this[key] = value;
        }

        this.setCity();
    }

    value()
    {
        if ( this.structured_formatting && this.structured_formatting.main_text ) {
            return this.structured_formatting.main_text;
        }
        return this.description;
    }

    text()
    {
        if ( this.structured_formatting ) {
            return this.structured_formatting.main_text + ' ' + this.structured_formatting.secondary_text.substr(0, this.structured_formatting.secondary_text.indexOf(',')); 
        }
        return this.description.substr(0, this.description.indexOf(',')); 
    }

    async setCity()
    {
        this.city = await this.getCity();
    }
  
    async getCity()
    {
        let city = this.text().substr(this.text().indexOf(' ') + 1); 
        if ( city ) {
            console.log('City found directly:', city);
            return city;
        }
        else {
        console.log('No city found?');

        let postal = this.structured_formatting.main_text;
        fetch('https://api-city-trust-up.herokuapp.com/cities').then(function (response) {
            return response.json();
        }).then(function (data) {

            function findCity(obj){
                if (obj.postal == postal){
                    return true;
                }else {
                    return false;
                };
            }
            let arrayWithRightPostal = data.filter(findCity);
            console.log(arrayWithRightPostal);
            for (let i=0;i<arrayWithRightPostal.length;i++){
                console.log("Nom de ville trouvée "+ arrayWithRightPostal[i].name);
            }

        }).catch(function (err) {
            console.warn('Something went wrong.', err);
        });
    }
}

    details()
    {
        return new Promise((resolve, reject) => {
            let service = new google.maps.places.PlacesService(document.createElement('div'));
            service.getDetails(
                {placeId: this.place_id},
                (place, status) =>
            {
                if ( status !== google.maps.places.PlacesServiceStatus.OK ) {
                    console.log('Could not find place with id', this.place_id, status);
                    return reject();
                }

                return resolve(new Place(place).format());
            });
        });
    }
};

window.SearchBox = function() {
    return {
        query: '',
        autocomplete: new GoogleAutocomplete(),
        results: [],
        search()
        {
            this.results = [];
            this.autocomplete.search(this.query)
                .then(results => this.results = results)
                .catch(() => this.results = []);
        },
        prediction()
        {
            return (this.results.length > 0 && this.query.length > 2 ) ? this.results[0] : null;
        },
        redirect()
        {
            return window.location.href = `${window.current.routes.quote}?workfield=${this.workfield}&postalCode=${this.prediction().value()}`;
        },
      init() {
        console.log('Init search component.', google);
        window.google = google;
      }
    }

}