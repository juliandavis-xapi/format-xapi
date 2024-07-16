
# xAPI Query to CSV / JSONL / xAPI JSON for AI

This project provides a web interface for querying xAPI (Experience API) statements from a Learning Record Store (LRS) and exporting the data in CSV, JSONL, or raw xAPI JSON formats. The tool is designed to help you fetch, process, and download xAPI statements easily.

## Features

- Fetch xAPI statements from an LRS.
- Export data in CSV, JSONL, or raw xAPI JSON formats.
- Display progress while fetching data.
- Anonymise actor information (email addresses).
- Responsive and user-friendly interface.

## Getting Started

### Prerequisites

- A Learning Record Store (LRS) endpoint.
- Credentials (client and secret) for accessing the LRS.
- Web browser to run the HTML file.

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/juliandavis-xapi/format-xapi.git
   cd format-xapi

   ```

2. Open the `index.html` file in your web browser.

### Usage

1. Enter the LRS endpoint, client, and secret in the form.
2. Specify the date range and limit for fetching xAPI statements.
3. Optionally, enter an Activity ID to filter statements by activity.
4. Select the desired output format (CSV, JSONL, or raw xAPI JSON).
5. Click the "Submit" button to start fetching data.
6. The progress bar will update as data is fetched.
7. Once complete, the data will be downloaded automatically.

### Files

- `index.html`: Main HTML file with the user interface.
- `css/styles.css`: Custom CSS styles.
- `js/app.js`: JavaScript file containing the main logic for fetching and processing xAPI statements.
- `js/xapiwrapper.min.js`: xAPI Wrapper library for interacting with the LRS.


### Dependencies

- [jQuery](https://jquery.com/)
- [Bootstrap](https://getbootstrap.com/)
- [xAPI Wrapper](https://github.com/adlnet/xAPIWrapper)
- [Font Awesome](https://fontawesome.com/)

### License

This project is open source and available under the MIT License.

### Author

Created by [Julian Davis](https://xapi.com.au)


### Acknowledgements

- Thanks to the developers of the xAPI Wrapper and other open source libraries used in this project.
