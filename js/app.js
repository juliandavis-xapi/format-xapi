$(document).ready(function() {
    let isFetching = true;
    document.getElementById('dateUntil').valueAsDate = new Date();
    
    const updateProgressBar = (percentage, currentCount, totalCount) => {
        $('#progressBar').css('width', `${percentage}%`).attr('aria-valuenow', percentage);
        $('#progressBar').text(`${currentCount} / ${totalCount}`);
    };

    const showMessage = (message, type) => {
        const alertClass = `alert alert-${type}`;
        $('#alertMessage').html(`<div class="${alertClass}" role="alert">${message}</div>`);
    };

    const getCurrentTimestamp = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    };

    const getDomainFromUrl = (url) => {
        const a = document.createElement('a');
        a.href = url;
        return a.hostname;
    };

    const disableForm = (disable) => {
        $('#queryForm :input').prop('disabled', disable);
        $('#stopButton').prop('disabled', !disable);
    };

    const testConnection = async (config) => {
        return new Promise((resolve, reject) => {
            try {
                ADL.XAPIWrapper.changeConfig(config);
                ADL.XAPIWrapper.getStatements({ limit: 1 }, null, (res) => {
                    if (res.status !== 200) {
                        reject('Error connecting to the Learning Record Store.');
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                reject(`Error in testConnection: ${error.message}`);
            }
        });
    };

    function obfuscateEmail(email) {
        const [localPart, domain] = email.split('@');
        const obfuscatedLocalPart = localPart.charAt(0) + '*'.repeat(localPart.length - 1);
        return `${obfuscatedLocalPart}@${domain}`;
    }

    function extractName(jsonString) {
        const data = JSON.parse(jsonString);
        if (data.name) {
            return data.name;
        } else if (data.account && data.account.name) {
            return data.account.name;
        } else {
            return null; // Return null if no name is found
        }
    }

    function iso8601ToSeconds(duration) {
        const pattern = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(\.\d+)?S)?$/;
        const matches = duration.match(pattern);
        if (matches) {
            const hours = matches[1] ? parseInt(matches[1]) : 0;
            const minutes = matches[2] ? parseInt(matches[2]) : 0;
            const seconds = matches[3] ? parseInt(matches[3]) : 0;
            const fractional = matches[4] ? parseFloat(matches[4]) : 0.0;
            
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + fractional;
            return totalSeconds;
        } else {
            return ""; // throw new Error("Invalid ISO 8601 duration format");
        }
    }

    function processStringToArray(inputString) {
        let trimmedString = inputString.trim().replace(/^\[|\]$/g, '');
        trimmedString = trimmedString.replace(/^"|"$/g, '');
        const array = trimmedString.split('[,]');
        return array;
    }

    const fetchStatements = async (config, query) => {
        let allStatements = [];
        let more = null;
        let fetchedCount = 0;

        const fetch = async () => {
            if (!isFetching || fetchedCount >= query['limit']) return allStatements;

            return new Promise((resolve, reject) => {
                ADL.XAPIWrapper.getStatements(query, more, (res) => {
                    if (res.status !== 200) {
                        reject('Error fetching statements.');
                        return;
                    }

                    const response = JSON.parse(res.response);
                    if (!response.statements) {
                        reject('No statements found.');
                        return;
                    }

                    allStatements = allStatements.concat(response.statements);
                    fetchedCount += response.statements.length;

                    if (response.more && response.more !== "" && isFetching) {
                        more = response.more;
                        fetch().then(resolve).catch(reject);
                    } else {
                        resolve(allStatements);
                    }

                    const totalCount = parseInt(query.limit);
                    const currentCount = allStatements.length;
                    const percentage = (currentCount / totalCount) * 100;
                    updateProgressBar(percentage, currentCount, totalCount);
                });
            });
        };

        await fetch();
        return allStatements;
    };

    const escapeCsvField = (field) => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };

    const processStatements = (statements, format, endpoint) => {
        let data, mimeType, extension;
        const obfuscateCheckbox = document.getElementById('obfuscateCheckbox').checked;

        switch (format) {
            case 'csv':
                data = "ID,Actor,Verb,ObjectID,Object,Duration,Score,Min,Max,Question Answers,Question Passed,Question Correct Answers,Users Answer,Timestamp\n" +
                statements.map((s, index) => {
                    const id = s.id;
                    var actor = "";
                    
                    if (obfuscateCheckbox) {
                        actor = s.actor.mbox ? obfuscateEmail(s.actor.mbox.replace('mailto:', '')) : '';
                    } else {
                        actor = s.actor.mbox ? s.actor.mbox.replace('mailto:', '') : '';
                    }
                
                    const verb = s.verb.display ? Object.values(s.verb.display)[0] : '';
                    const objectName = s.object.definition && s.object.definition.name ? escapeCsvField(Object.values(s.object.definition.name)[0]) : '';
                    const objectId = s.object.id;
                    const timestamp = s.timestamp;
            
                    let duration = "0";
                    let score = "", min = "", max = "";
                    try {
                        if (s.result && s.result.duration) {
                            duration = iso8601ToSeconds(s.result.duration);
                        }
                        if (s.result && s.result.score) {
                            score = s.result.score.raw !== undefined ? s.result.score.raw : "";
                            min = s.result.score.min !== undefined ? s.result.score.min : "";
                            max = s.result.score.max !== undefined ? s.result.score.max : "";
                        }
                    } catch (ex) {
                        duration = ex.message;
                    }
            
                    let questionAnswers = "";
                    let questionPassed = "";
                    let questionCorrectAnswers = "";
                    let usersAnswer = "";
            
                    if (s.result && s.result.response) {
                        let res;
                        try {
                            res = typeof s.result.response === 'string' ? JSON.parse(s.result.response) : s.result.response;
                        } catch (error) {
                            res = s.result.response; // Use the response as is if parsing fails
                        } finally {
                            questionPassed = res.success ? 'True' : 'False';
                            let i = 1;

                            let choices;
                            try {
                                choices = typeof s.result.choices === 'string' ? JSON.parse(s.result.choices) : s.result.choices;
                                if (Array.isArray(choices)) {
                                    choices.forEach(choice => {
                                        questionAnswers += `id= ${i}: ${choice.id} Answer=${choice.description.und}|`;
                                     
                                        const arrayResponses = processStringToArray(s.result.correctResponsesPattern);
                                        questionCorrectAnswers = '';
                                        arrayResponses.forEach(cresp => {
                                            questionCorrectAnswers += ` id=${cresp} Answer=${choice.description.und}|`;
                                        });
                        
                                        const arrayUserResponses = processStringToArray(s.result.responses);
                                        usersAnswer = '';
                                        arrayUserResponses.forEach(cresp => {
                                            usersAnswer += ` id=${cresp} Answer=${choice.description.und}|`;
                                        });
                        
                                        i++;
                                    });
                                } else {
                                    usersAnswer += "";
                                    questionAnswers += "";
                                }
                            } catch (error) {
                                usersAnswer += "";
                                questionAnswers += "";
                                console.error('Error parsing choices:', error);
                            }
                        }
                    }
            
                    return `${id},${actor},${verb},${objectId},${objectName},${duration},${score},${min},${max},${questionAnswers},${questionPassed},${questionCorrectAnswers},${usersAnswer},${timestamp}`;
                }).join("\n");

                mimeType = 'text/csv';
                extension = 'csv';
                break;
            case 'jsonl':
                data = statements.map(statement => JSON.stringify(statement)).join('\n');
                mimeType = 'application/json';
                extension = 'jsonl';
                break;
            case 'raw':
                data = JSON.stringify(statements, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
            default:
                throw new Error('Invalid format selected.');
        }

        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${getDomainFromUrl(endpoint)}_statements_${getCurrentTimestamp()}.${extension}`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const formatDateToISO8601 = (date) => {
        return new Date(date).toISOString().split('.')[0];
    };

    $('#queryForm').submit(async function(event) {
        event.preventDefault();
        isFetching = true;
        $('#loadingMessage').show();
        $('#alertMessage').html('');
        $('.progress').show();
        updateProgressBar(0, 0, $('#limit').val());
        disableForm(true);

        const endpoint = $('#endpoint').val();
        const client = $('#client').val();
        const secret = $('#secret').val();
        const dateSince = formatDateToISO8601($('#dateSince').val());
        const dateUntil = formatDateToISO8601($('#dateUntil').val());
        let limit = $('#limit').val();
        const format = $('#outputFormat').val();
        const search = $('#search').val().trim(); // Read the search field
        const searchVerb = $('#searchVerb').val().trim(); // Read the search field


        if (limit > 1000) {
            limit = 1000;
        }

        const auth = "Basic " + btoa(client + ":" + secret);
        const config = {
            endpoint: endpoint,
            auth: auth
        };

        try {
            await testConnection(config);

            const query = ADL.XAPIWrapper.searchParams();
            query['since'] = dateSince;
            query['until'] = dateUntil;
            query['limit'] = limit;

            if (search) {
                query['activity'] = search; // Replace wildcard with regex equivalent
            }
            
            if (searchVerb) {
                query['verb'] = searchVerb; // Replace wildcard with regex equivalent
            }

            const statements = await fetchStatements(config, query);
            processStatements(statements, format, endpoint);
            showMessage('Data successfully fetched and downloaded.', 'success');
        } catch (error) {
            console.error('An error occurred:', error);
            showMessage(`Error: ${error}`, 'danger');
        } finally {
            $('#loadingMessage').hide();
            $('.progress').hide();
            disableForm(false);
        }
    });

    $('#stopButton').click(function() {
        isFetching = false;
    });
});
