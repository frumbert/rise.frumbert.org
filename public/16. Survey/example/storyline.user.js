function ExecuteScript(strId)
{
  switch (strId)
  {
      case "6fJSEQG0lm9":
        Script1();
        break;
  }
}

function Script1()
{
  /*
 *  A multi-page survey based on a simple text definition
 *  The survey is defined as a string, with each question on one or more lines.
 *  Supports several question types, formatting, html and css
 *  Uses a fieldset for each page, with a nav for page navigation, and a submit button
 *  Submits to a remote server, the URL is defined in the question text
 *  Designed for use within Articulate Storyline 360, published through Rise 360
 *  Author: Tim St Clair 2023
 */

const BLOCK = window.name;

// I know they say don't use globals, but I am
window.SURVEY = window.SURVEY || {};
window.SURVEY.INPUTS = [];
window.SURVEY.STAR = "⭐️"; 

window.SURVEY.DATA = `
action:https://amalgam-kittyworth-56.free.beeceptor.com

submit:Submit survey
Thanks for taking the survey.
Your responses have been recorded.

fillin:[1]
What is your name

fillin:[5]
Tell something personal about yourself

star:[no,maybe,yes]
Your opinion of this survey

page:radio buttons

truefalse:[Oui,Non]
I am fluent in <em>Le français</em>

label:The choice presents several dichotomies which are idential for each choice row.

choice:[ Dogs , Cats , Horses ,  , Mice ]
Elephants are afraid of
Cats are afraid of
Mice are afraid of
Dogs are afraid of

page:dropdowns

label:Dropdowns can either be a single value, or multiple values.
When using multiple dropdowns, each option can only be selected once.

matching : [ Electricity=Light globes , Water=Faucets,  Alcohol = Drunkards, Sugar =Doughnuts]
Match the item to its filling

dropdown : [Wine,Beer,Tequila,Asprin,Caffiene]
What is your vice?

page:regular items

label : some regular form controls are supported too

numeric:[50,100]
How many roads can a man walk down?
How long is a peice of string (in cm)

range:[20,80]
The range slider lets you put in a value between two numbers
It supports multiple inputs as well on the same range

range:[1,5]
On a scale from 1 to 5, how are you feeling today?

page:other details

label:everything that doesn't match is a comment. the first line of a label has a classname to differentiate it.
labels are possible
even multiline labels <strong>with tags</strong>.

because this line doesn't start with the correct word, this isn't a label and should be ignored.

The next tag is also ignored since it doesn't match to a known handler.

bokers:[1,2,3]
it looks like it should work
doesn't it?

label: Choices use checkboxes instead of radios and their answers are CSV

choices:[Tracks,Roads,Streets,Avenues]
Cities have
Towns have
Villages have

page:

label: likert questions are presented in a table.

likert

likert:[Disagree,Neutral,Agree,]
Purple is the best colour
Cats are mind-controlling humans
Water can be dehydrated

label: It's just utf-8, so you can use emoji too:

likert:[😂,😃,🤨,😟,😭]
🌅
🌌
🏞

page:ratings

star:[😂,😃,🤨,😟,😭]
How much do you like this survey?


`;

console.log("SURVEY.DATA", window.SURVEY.DATA);

// main entry point
    const supportedTypes = ['likert','truefalse','choice','choices','matching','dropdown','numeric','choices','fillin','label','page','range','star','submit','action'];
    let submitButton = `<p><input type='submit' name='action' value='Submit'></p>`;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://amalgam-kittyworth-56.free.beeceptor.com";

    const output = document.createDocumentFragment();
    output.appendChild(form);

    // the ore logic is to split the input into blocks of lines, then validate each block; everything that doesn't validate is just a comment and is ignored
    let regex = /^\s*\r?\n/gm; // start-of-line + optional whitespace + one-or-more newlines, match multiple times, multiline
    const questions = window.SURVEY.DATA
                        .split(regex) // raw input into blocks of lines
                        .filter(((value) => { // validate each item
                            return value.indexOf(':') !== -1 && supportedTypes.indexOf(value.split(":").map(s=>s.trim())[0]) !== -1; // filter to only supportedTypes
                        }))
                        .map((value) => { // convert valid strings to objects
                            const [type,rest] = value.split(":", 2).map(s=>s.trim()); // type, and everything else
                            const [dichotomies,...lines] = rest.split(/\r?\n/); // choices, and everything else as an array
                            const r = {
                                type,
                                lines: lines.map(s=>s.trim()).filter(s=>s.length),
                                dichotomies: dichotomies.replace(/^\[+|\]+$/g,'').split(',').map(s=>s.trim()).filter(s=>s.length).map(s=>{return s.indexOf("=")!==-1?s.split("=").map(t=>t.trim()):s}), // purpose: it's clear as mud - basically a list of choices and optional choice values
                            }
                            return r;
                        });

    //each 'page' of the survey is a fieldset; a page can contain one or more questions; pages optionally have a header; the submit page is always its own fieldset
    let fieldset = document.createElement("fieldset");
    fieldset.classList.add("overview-page");
    fieldset.innerHTML = "<h1>To begin the survey, click the button below.</h1>"
    form.appendChild(fieldset);

    fieldset = document.createElement("fieldset");
    form.appendChild(fieldset);

    console.info('starting questions loop', questions);

    // here's the main renderer for each question type
    for (question of questions) {
        let tag;
        switch (question.type) {

            case 'submit':
                submitButton = `<p><input type='submit' name='action' value='${question.dichotomies.join(' ')}'></p>`;
                form.dataset.thanks = btoa(question.lines.join("\n"));
                break;

            case 'page':
                /*
                value: each question is a new page. if text comes after the colon, use it as a legend
                */
                fieldset = document.createElement("fieldset");
                form.appendChild(fieldset);
                let legend = question.dichotomies.join('');
                if (legend.length) fieldset.appendChild(fragment(`<legend>${legend}</legend>`));
                break;

            case 'likert':
                /*
                value: each question has a col (bascially choice with a table layout)
                            col    col    col
                question    [x]    [o]    [o]     (hidden: n/a)
                question    [x]    [o]    [o]     (hidden: n/a)
                question    [o]    [o]    [x]     (hidden: n/a)
                */
                tag = [`<table data-type="likert"><thead><tr><td></td>`];
                question.dichotomies.forEach(s=>{ tag.push(`<th>${s}</th>`); });
                tag.push('</tr></thead><tbody>');
                question.lines.forEach(line=>{
                    const id = uid();
                    const name = 'q'+crc32(line);
                    tag.push(`<tr><th><input type='hidden' id="${id}" name="${name}" value="${line}">${line}</th>`);
                    question.dichotomies.forEach((s,i)=>{
                        tag.push(`<td><input type="radio" value="${s}" name="${name}"></td>`);
                    });
                    tag.push('</tr>');
                    window.SURVEY.INPUTS.push(name);
                });
                tag.push('</tbody></table>');
                fieldset.appendChild(fragment(tag.join``));
            break;

            case 'truefalse':
                /*
                value: each question has one of two answers
                question    [o] Oui    [x] Non     (hidden: n/a)
                question    [x] Oui    [o] Non     (hidden: n/a)
                */
                for (line of question.lines) {
                    tag = choice(line, question.dichotomies, 'truefalse');
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
            break; 

            case 'choice':
                /*
                value: each question has one answer
                question    [o] One    [x] Two  [o] Three     (hidden: n/a)
                question    [o] One    [o] Two  [o] Three     (hidden: n/a)
                */
                for (line of question.lines) {
                    tag = choice(line, question.dichotomies, 'single');
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
            break; 

            case 'choices':
                /*
                value: each question has one or more answers
                question     [x] One  [ ] Two   [ ] Three      (hidden: n/a)
                question     [ ] One  [x] Two   [x] Three      (hidden: n/a)
                */
                for (line of question.lines) {
                    tag = choices(line, question.dichotomies);
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
            break; 

            case 'matching':
                /*
                value: how important are these items (each choice can be reused across questions)
                question    [a    [v] [b   [v] 
                            [1      ] [1     ]
                            [2      ] [2     ]

                */
                for (line of question.lines) {
                    tag = matching(line, question.dichotomies);
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
            break; 

            case 'dropdown':
                /*
                value: how important are these items (each choice only available once across all questions
                question    [b    [v]
                            [c      ]
                            [a      ]
                */
                for (line of question.lines) {
                    tag = dropdown(line, question.dichotomies);
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
            break;

            case 'numeric':
                /*
                value: each question has a numeric value between n and m
                question    [n..m] 
                question    [n..m] 
                */
                for (line of question.lines) {
                    tag = numeric(line, question.dichotomies);
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
                break; 

            case 'range':
                /*
                value: each question has a numeric value between n and m
                question    [n..m] 
                question    [n..m] 
                */
                for (line of question.lines) {
                    tag = range(line, question.dichotomies);
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
                break; 

            case 'star':
                /*
                value: list of possible values
                question    [n..m] 
                question    [n..m] 
                */
                for (line of question.lines) {
                    tag = star(line, question.dichotomies);
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
                break; 

            case 'fillin':
                /*
                value: each question has a text response (of line height N)
                question    [  ...  ] 
                question    [
                            ...
                            ...
                            ] 
                */
                for (line of question.lines) {
                    tag = fillin(line, question.dichotomies);
                    window.SURVEY.INPUTS.push(tag.name);
                    fieldset.appendChild(tag.node);
                }
                break; 

            case 'label':
                /*
                value: none, just display whatever is after the colon
                header
                div
                div
                */
                tag = label(question);
                fieldset.appendChild(tag.node);
                break;
        }
    }

    fieldset = document.createElement("fieldset");
    fieldset.classList.add("submit-page");
    fieldset.innerHTML = submitButton;
    form.appendChild(fieldset);

    const fieldsets = form.querySelectorAll('fieldset');
    fieldsets.forEach((fieldset,i) => {
        fieldset.setAttribute('id','page-' + (i+1));
        let nav = document.createElement('nav');
        nav.setAttribute('aria-label','Page Navigation');
        nav.setAttribute('role','navigation');
        let tag = [];
        if (i>0) tag.push(`<a class='prev' href="#page-${i}" aria-label="Previous Page"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle opacity="0.5" cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5"/><path d="M13.5 9L10.5 12L13.5 15" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`);
        if (i==fieldsets.length-1) tag.push(`<a class='reload' href='#page-1' aria-label="Start over" onclick="document.forms[0].reset();return true;"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.71275 10.6736C7.16723 8.15492 9.38539 6.25 12.0437 6.25C13.6212 6.25 15.0431 6.9209 16.0328 7.9907C16.3141 8.29476 16.2956 8.76927 15.9915 9.05055C15.6875 9.33183 15.213 9.31337 14.9317 9.0093C14.2154 8.23504 13.1879 7.75 12.0437 7.75C10.2056 7.75 8.66974 9.00212 8.24452 10.6853L8.48095 10.4586C8.77994 10.172 9.25471 10.182 9.54137 10.4809C9.82804 10.7799 9.81805 11.2547 9.51905 11.5414L7.89662 13.0969C7.74932 13.2381 7.55084 13.3133 7.34695 13.3049C7.14306 13.2966 6.95137 13.2056 6.81608 13.0528L5.43852 11.4972C5.16391 11.1871 5.19267 10.7131 5.50277 10.4385C5.81286 10.1639 6.28686 10.1927 6.56148 10.5028L6.71275 10.6736Z" fill="#1C274C"/><path d="M16.6485 10.6959C16.8523 10.704 17.044 10.7947 17.1795 10.9472L18.5607 12.5019C18.8358 12.8115 18.8078 13.2856 18.4981 13.5607C18.1885 13.8358 17.7144 13.8078 17.4393 13.4981L17.2841 13.3234C16.8295 15.8458 14.6011 17.7509 11.9348 17.7509C10.3635 17.7509 8.94543 17.0895 7.95312 16.0322C7.66966 15.7302 7.68472 15.2555 7.98675 14.9721C8.28879 14.6886 8.76342 14.7037 9.04688 15.0057C9.76546 15.7714 10.792 16.2509 11.9348 16.2509C13.7819 16.2509 15.322 14.9991 15.7503 13.3193L15.5195 13.5409C15.2208 13.8278 14.746 13.8183 14.4591 13.5195C14.1721 13.2208 14.1817 12.746 14.4805 12.4591L16.0993 10.9044C16.2464 10.7631 16.4447 10.6878 16.6485 10.6959Z" fill="#1C274C"/><circle opacity="0.5" cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5"/></svg></a>`);
        if (i<fieldsets.length-1) tag.push(`<a class='next' href="#page-${i+2}" aria-label="Next Page"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle opacity="0.5" cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5"/><path d="M10.5 9L13.5 12L10.5 15" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`);
        nav.innerHTML = tag.join``;
        fieldset.appendChild(nav);
    });

    console.info('about to inject frame stuff');

    // here is where we attach the survey to the page
    // but because we are actually INSIDE a storyline slide, we need to remove the content first then add our survey in its place
    SetUpEverythingToBeginWithByRemovingStorylineAndInjectingOurOwnStuff(output);

    // hook up the form submit logic to a function
    form.addEventListener('submit', formSubmit);

/* ------------------ utility functions ------------------ */

// test for cross domain script access
function isCrossDomain() {
    try {
        window.parent.document;
    } catch (e) {
        return true;
    }
    return false;
}

// find where the rise course is running
function findRuntimeWindow(win) {
    try {
        if (win.hasOwnProperty("courseData") || win.hasOwnProperty("courseId")) return win;
        else if (win.parent == win) return null;
        else return findRuntimeWindow(win.parent);
    } catch (e) {
        return window;
    }
}

// rise puts this property on courses published to lms
function findLMSAPI(win) {
    try {
     if (win.hasOwnProperty("GetStudentID")) return win;
     else if (win.parent == win) return null;
     else return findLMSAPI(win.parent);
    } catch(e) {
        return null;
    }
}

// a couple of ways to make a unique id that can be used as a name for a form element
const uid=function(){return ('q'+1e11).replace(/[018]/g, c =>(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))}
const crc32=function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};

// submit the form and show a message
function formSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const lms = findLMSAPI(window);
    if (lms) { // if this is running inside an LMS, add the student id to the form
        fd.append('lms_student_id',lms.GetStudentID());
    }
    const source = new URLSearchParams(fd);
    const body = new FormData();
    for (const name of window.SURVEY.INPUTS) {
        if (!name.length) continue;
        const [fn,...opts] = source.getAll(name);
        body.append(plain(fn),opts.join());
    }
    fetch(e.target.getAttribute('action'), {
        method: e.target.getAttribute('method'),
        body
    }).then(response => {
        if (response.ok) {
            return response.text();
        } else {
            throw new Error(response.statusText);
        }
    }).then(data => {
        console.info(data);
        try { // complete the course if it's running in storyline
            const storyline = GetPlayer();
            storyline.SetVar("completed", "1");
        } catch(e) {}
        if (e.target.dataset.thanks) {
            const thanks = atob(e.target.dataset.thanks).split(/\r?\n/).map(s=>s.trim()).filter(s=>s.length).join('<br>');
            const dialog = document.createElement('dialog');
            dialog.addEventListener('close', () => {
                document.querySelector('dialog').remove();
            });
            dialog.innerHTML = `<form><button type="submit" aria-label="close" formmethod="dialog" formnovalidate>&times;</button>${thanks}</form>`;
            document.body.appendChild(dialog);
            dialog.showModal();
        }
    }).catch(error => {
        console.error(error);
    });
}

// function unique(value,index,array) {
//     return self.indexOf(value)===index;
// }

// convert HTML to plain text
function plain(text) {
    const d = document.createElement('div');
    d.innerHTML = text;
    return d.textContent || '';
}

// convert a string to a DOM node
function fragment(string) {
    var renderer = document.createElement('template');
    renderer.innerHTML = string;
    return renderer.content;
}

// render a label - just display whatever is after the colon (it supports html)
function label(question) {
    let tag = [`<div data-type="label">`];
    tag.push(`<div class='header'>${question.dichotomies.at(0)}</div>`);
    for (line of question.lines) tag.push(`<div>${line}</div>`);
    tag.push('</div>');
    return { node: fragment(tag.join``) };    
}

// render a text input - allow a single line or multiple lines
function fillin(label,values) {
    const id = uid();
    const name = 'q'+crc32(label);
    const value = values.map(s=>parseInt(s,10)).at(0);
    let tag = [`<div data-type="fillin">`];
    tag.push(`<input type='hidden' name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    if (value===1) {
        tag.push(`<input id="${id}" type="text" name="${name}">`);
    } else {
        tag.push(`<textarea rows="${value}" id="${id}" name="${name}"></textarea>`);
    }
    tag.push('</div>');
    return { id, name, node: fragment(tag.join``) };
}

// render a numeric input - only allow a number between min and max
function numeric(label,values) {
    const id = uid();
    const name = 'q'+crc32(label);
    const value = values.map(s=>parseInt(s,10)).reduce((a,b)=>a+b,0) / 2 >> 0; // find half-way between min and max as a whole number
    let tag = [`<div data-type="numeric">`];
    tag.push(`<input type='hidden' name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    tag.push(`<input id="${id}" type="number" value="${value}" min="${values[0]}" max="${values[1]}" name="${name}" size="${values[1].toString().length + 1}">`);
    tag.push('</div>');
    return { id, name, node: fragment(tag.join``) };
}

// draw a range slider - only allow a number between min and max
function range(label,values) {
    const id = uid();
    const name = 'q'+crc32(label);
    const value = values.map(s=>parseInt(s,10)).reduce((a,b)=>a+b,0) / 2 >> 0; // find half-way between min and max as a whole number
    let tag = [`<div data-type="range">`];
    tag.push(`<input type='hidden' name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    tag.push(`<span role='control-group'>`);
    tag.push(`<input id="${id}" type="range" value="${value}" min="${values[0]}" max="${values[1]}" name="${name}" oninput="this.nextElementSibling.textContent=this.value">`);
    tag.push(`<output for="${id}">${value}</output>`);
    tag.push(`</span>`);
    tag.push('</div>');
    return { id, name, node: fragment(tag.join``) };
}

// the worlds worst star rating system, really just a series of radio buttons
// TODO: use CSS psuedo elements to fill stars previous(left) to the current selection
function star(label,values) {
    const id = uid();
    const name = 'q'+crc32(label);
    let tag = [`<div data-type="star">`];
    tag.push(`<input type='hidden' name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    tag.push(`<span role='control-group'>`);
    values.forEach((v,i) => {
        tag.push(`<input type="radio" data-subtype='star' value="${v}" name="${name}" id="${id}_${i}"><label for="${id}_${i}">${window.SURVEY.STAR}</label>`);
    });
    tag.push(`</span>`);
    tag.push('</div>');
    return { id, name, node: fragment(tag.join``) };
}

// render a series of radio buttons - only allow one choice
function choice(label,values,subtype) {
    const id = uid();
    const name = 'q'+crc32(label);
    let tag = [`<div data-type="${subtype}">`];
    tag.push(`<input type='hidden' id="${id}" name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    values.forEach((v,i) => {
        tag.push(`<input type="radio" value="${v}" name="${name}" id="${id}_${i}"><label for="${id}_${i}">${v}</label>`);
    });
    tag.push('</div>');
    return { id, name, node: fragment(tag.join``) };
}

// render a series of checkboxes - allow multiple choices
function choices(label,values) {
    const id = uid();
    const name = 'q'+crc32(label);
    let tag = ['<div data-type="multiple">'];
    tag.push(`<input type='hidden' id="${id}" name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    values.forEach((v,i) => {
        tag.push(`<input type="checkbox" value="${v}" name="${name}" id="${id}_${i}"><label for="${id}_${i}">${v}</label>`);
    });
    tag.push('</div>');
    return { id, name, node: fragment(tag.join``) };
}

// render a series of drop-down lists - only allow each choice to be selected once across all dropdowns
function matching(label,values) {
    const id = uid();
    const name = 'q'+crc32(label);
    const left = values.map(s=>s[0]);
    const right = values.map(s=>s[1]);
    let tag = [`<div data-type="matching">`];
    tag.push(`<input type='hidden' id="${id}" name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    left.forEach((v,i)=> {
        tag.push(`<span role='control-group'>`);
        tag.push(`<label for="${id}_${i}">${v}</label>`);
        tag.push(`<select id="${id}_${i}" name="${name}" onchange='checkMatching(this)'>`); // TODO: bind this instead of referencing window.checkMatching(this)
        tag.push(`<option value="">-</option>`);
        right.map((item) => {
            tag.push(`<option data-text="${item}" value="${v}=${item}">${item}</option>`);
        });
        tag.push('</select></span>');
    });
    tag.push('</div>');
    return { id, name, node: fragment(tag.join``) };
}

// render a drop-down list of choices - a regular single-choice question, but with a select element
function dropdown(label,values) {
    const id = uid();
    const name = 'q'+crc32(label);
    let tag = [`<div data-type="dropdown">`];
    tag.push(`<input type='hidden' name="${name}" value="${label}">`);
    tag.push(`<label for="${id}">${label}</label>`);
    tag.push(`<select id="${id}" name="${name}">`);
    tag.push(`<option value="">-</option>`);
    values.forEach((v,i) => {
        tag.push(`<option value="${v}">${v}</option>`);
    });
    tag.push('</select></div>');
    return { id, name, node: fragment(tag.join``) };
}

// allow an option to be selected only once across multiple dropdowns
window.checkMatching = function(el) {
    const values = [];
    const siblings = Array.from(el.closest("[data-type='matching']").querySelectorAll("select"));
    el.closest("[data-type='matching']").querySelectorAll("option").forEach(o=>o.removeAttribute('disabled'));
    siblings.forEach(node => {
        if (node.value.length) values.push(`option[data-text='${node.options[node.selectedIndex].text}']`);
    });
    if (values.length) siblings.forEach(node => {
        Array.from(node.querySelectorAll(values.join())).forEach(o => { !o.selected && o.setAttribute("disabled",true); });
    });
}

function SetUpEverythingToBeginWithByRemovingStorylineAndInjectingOurOwnStuff(theContent) {
    // delete the whole storyline everything (slide, player, etc)
    document.querySelector('#preso').innerHTML = '';
    console.info('cleaning out #preso');

    // find and remove the stylesheet that ends in /desktop.min.css - it's all the storyline stuff we don't need
    document.querySelectorAll('link').forEach(link => {
        if (link.href.indexOf('/desktop.min.css') !== -1) {
            link.remove();
        }
    });
    // find and remove any styles on the body
    document.body.removeAttribute('style');

    // and remove any style tags that are within the body
    document.querySelectorAll('style').forEach(style => {
        if (style.parentNode === document.body) {
            style.remove();
        }
    });

    // inject our own css
    InjectCSS();
    console.info('injected our own css');

    // now we can put in our own content
    console.info('injecting our own content', theContent);
    document.querySelector('#preso').appendChild(theContent);

    // the following only works if cross-domain access is allowed by the browser
    if (window.parent !== window.self && !isCrossDomain()) {
        try {

            // try to match the background of the storyline object to the block colour in rise
            if (!document.querySelector('#stylepatch')) {
                let style = parent.window.getComputedStyle(IFRAME.closest('.blocks-storyline'));
                let mystyle = document.createElement('style');
                mystyle.id = 'stylepatch';
                mystyle.textContent = 'body,#wrapper,.slide .dropin-wrap rect[id^="slide-bg-"] { background-color: ' + style.backgroundColor + ' !important; fill: rgba(0,0,0,0) !important; }';
                document.body.appendChild(mystyle);
                // shrink the padding on the parent frame
                // mystyle = parent.document.createElement('style');
                // mystyle.textContent = '.blocks-storyline__wrapper { padding: 0 1.9999998rem !important; }';
                // parent.document.body.appendChild(mystyle);
            }
        } catch(e) {}

        // this tries to make the storyline interaction iframe match the height of its content
        try {
            let bbox = document.body.getBoundingClientRect();
            const iframeName = `iframe[name="${BLOCK}"]`;
            parent.document.querySelector(iframeName).style.height = bbox.height + 'px';
            parent.document.querySelector(iframeName).closest('.embed--iframe').style.paddingBottom = 'unset';
            parent.document.querySelector(iframeName).closest('.embed--iframe').style.height = bbox.height + 'px';
        } catch (e) {}
    }
}

// inject the CSS this survey needs
function InjectCSS() {
    if (document.getElementById('injected-css')) return;
    const css = `
:root {
  --buttonSize: 32px;
  --tint: #00900090;
  --contrast: white;
  --fill: color-mix(in lab, var(--tint) 10%, var(--contrast));
}

h1 { font-weight: 300; }

button,
[type="button"],
[type="reset"],
[type="submit"],
[type="image"],
[type="checkbox"],
[type="radio"],
summary {
	cursor: pointer;
}

input:is([type="button"], [type="submit"], [type="reset"]), button {
  transform: scale(2);
}

dialog::backdrop { /* can't use variables in ::backdrop since it doesn't inherit from anything */
  background-color: color-mix(in lab, #c0900090 10%, #ffffff90);
}
dialog {
  border: 2px solid var(--tint);
  padding: 1rem;
  border-radius: 4px;
  background-color: white;
  min-width: 33vw;
}
dialog button {
  background: transparent;
  border: none;
  padding: 0 .5rem;
  outline: none;
  float: right;
  margin: 0 0 .5rem .5rem;
  font-size: 1.25rem;
}
body { margin: 0; overflow: hidden; font-family: 'Open Sans', 'Montserrat', sans-serif; font-weight: 300; }

    div{margin-block-start: 1rem;}

    fieldset { border-collapse: collapse; }

    [data-type='star'] > label:first-of-type,
    [data-type='single'] label:first-of-type,
    [data-type='matching'] > label:first-of-type,
    [data-type='dropdown'] label:first-of-type,
    [data-type='fillin'] label:first-of-type,
    [data-type='numeric'] label:first-of-type,
    [data-type='truefalse'] label:first-of-type {
        display: block;
        margin-bottom: 5px;

    }
    input[type='radio'][id$='_0'] { margin-inline-start: 0 }

    [data-type] input:not([type='hidden']) + label {
      position: relative;
    }

/* inputs with visual control */
[data-type='matching'],
[data-type='single'],
[data-type='multiple'],
[data-type='truefalse'] {
  display: flex;
  flex-direction: column;
  gap: 5px;
  position: relative;
}

[data-type='star'] [role='control-group'] {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
}[data-type='star'] [role='control-group'] label {
  flex: unset;
}

[data-type='range'] [role='control-group'] {
  flex-direction: row;
  align-items: center;
  display: flex;
}
[data-type='range'] [role='control-group'] input[type='range'] {
  flex: 1;
}
[data-type='range'] [role='control-group'] output {
  --arrow: 12px;
  min-width: 3ch;
  text-align: center;
  margin-left: var(--arrow);
  background: var(--tint);
  color: var(--contrast);
  padding: .3rem .7rem;
  border-radius: 4px;
  position: relative;
}
[data-type='range'] [role='control-group'] output::before {
  content: '';
  position: absolute;
  top: 50%;
  left: calc(-1* var(--arrow));
  transform: translateY(-50%);
  border: calc(var(--arrow) / 2) solid transparent;
  border-right-color: var(--tint);
}

[data-type='star'],
[data-type='fillin'],
[data-type='dropdown'],
[data-type='matching'],
[data-type='multiple'],
[data-type='single'] {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
}

[data-type='fillin'] label:first-of-type,
[data-type='dropdown'] label:first-of-type,
[data-type='matching'] label:first-of-type,
[data-type='single'] label:first-of-type,
[data-type='multiple'] label:first-of-type,
[data-type='truefalse'] label:first-of-type {
  flex: 0 0 100%;
}

[data-type='matching'] span[role='control-group'] {
  border: 1px solid var(--tint);
  background-color: var(--fill);
  flex: 1;
  padding: .5rem;
}
[data-type='single'] label:not(:first-of-type),
[data-type='multiple'] label:not(:first-of-type),
[data-type='truefalse'] label:not(:first-of-type) {
  flex: 1;
  border: 1px solid var(--tint);
  background-color: var(--fill);
  transition: background-color .3s;
  padding: 1rem 1rem 1rem 3rem;
}

[data-type] input[type='radio'][data-subtype='star'] + label {
  filter: grayscale(1);
  margin-right: .5rem;
}
[data-type] input[type='radio'][data-subtype='star'] + label:hover {
  filter: grayscale(.5);
}
[data-type] input[type='radio'][data-subtype='star']:checked + label {
  filter: grayscale(0);
}

/* add psuedoelements inside labels for radios */
[data-type] input[type='radio']:not([data-subtype]) + label::before {
  position: absolute;
  content: '';
  width: 16px;
  height: 16px;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
  border-radius: 50%;
  border: 2px solid black;
  background-color: white;
  transition: background-color .35s, box-shadow .5s;
  box-shadow: inset 0 0 0 0 white;
}
[data-type] input[type='radio']:checked:not([data-subtype]) + label {
  background: var(--tint);
}
[data-type] input[type='radio']:checked:not([data-subtype]) + label::before {
  background-color: black;
  box-shadow: inset 0 0 0 4px white;
}

/* add psuedoelements inside labels for checkboxes */
[data-type] input[type='checkbox'] + label::before {
  position: absolute;
  content: '';
  width: 16px;
  height: 16px;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
  border: 2px solid black;
  background: white;
  cursor: pointer;
}
[data-type] input[type='checkbox']:checked + label {
  background: var(--tint);
}
[data-type] input[type='checkbox']:checked + label::before {
  content: '✔';
  text-align: center;
}

/* textual inputs */
[data-type='fillin'] input[type='text'],
[data-type='fillin'] textarea,
[data-type='numeric'] input[type='number'] {
  background-color: var(--fill);
  border: 1px solid var(--tint);
  padding: .5rem;
  font-size: inherit;
}
[data-type='fillin'] textarea {
  width: calc(100% - 20px);
  resize: vertical;
}

/* all this for a range slider control */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
}
input[type="range"]:focus {
  outline: none;
}
input[type="range"]::-webkit-slider-runnable-track {
  background-color: var(--fill);
  border-radius: 0.5rem;
  height: 0.25rem;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; /* Override default look */
  appearance: none;
  margin-top: -6px; /* Centers thumb on the track */
  background-color: var(--tint);
  border-radius: 0.5rem;
  height: 1rem;
  width: 1rem;
}
input[type="range"]:focus::-webkit-slider-thumb {
  outline: 3px solid var(--tint);
  outline-offset: 0.125rem;
}
input[type="range"]::-moz-range-track {
  background-color: var(--tint);
  border-radius: 0.5rem;
  height: 0.25rem;
}
input[type="range"]::-moz-range-thumb {
  background-color: var(--tint);
  border: none; /*Removes extra border that FF applies*/
  border-radius: 0.5rem;
  height: 1rem;
  width: 1rem;
}
input[type="range"]:focus::-moz-range-thumb{
  outline: 3px solid var(--tint);
  outline-offset: 0.125rem;
}

/* hide input controls for radios, checkboxes */
[data-type]:not([data-type='likert']) input[type='radio'], [data-type] input[type='checkbox'] {
	position: absolute !important;
	clip: rect(0, 0, 0, 0);
	height: 1px;
	width: 1px;
	border: 0;
	overflow: hidden;
}

    [role='control-group'] { display: inline-block; margin-right: 1rem; }
    [role='control-group'] label { display: block; }

    [data-type='likert'] {
      margin: 1rem auto;
    }
    [data-type='likert'] th { background-color: var(--fill); }
    [data-type='likert'], [data-type='likert'] td, [data-type='likert'] th {
        border: 1px solid var(--tint);
        border-collapse: collapse;
        text-align: center;
        font-weight: normal;
    }
    [data-type='likert'] tbody th { text-align: right; }
    [data-type='likert'] th, [data-type='likert'] td { padding: .5rem }
    [data-type='likert']>thead>tr>td:first-of-type { border-top-color:transparent;border-left-color:transparent; }

  /* labels */
  [data-type='label'] {
    background: #f8f8f8;
    border-left: 2px solid var(--tint);
    padding: 1rem;
  }
  [data-type='label'] .header {
    margin-block-start: 0;
    font-weight: 600;
  }
  [data-type='label'] > *:last-child {
    margin-bottom: 0;
  }
nav { position: sticky; bottom: 0; }
nav a circle { transition: stroke .3s; }
a.next:hover circle, a.prev:hover circle, a.reload:hover circle {
  stroke: var(--tint);
}

#SURVEY {
  width: 720px;
  overflow: hidden;
  margin: 0;
}
#SURVEY>form {
  display: flex;
  justify-content: stretch;
  overflow-x: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
#SURVEY>form {
  padding: 10px;
}
#SURVEY>form>fieldset {
  scroll-snap-align: start;
  flex-shrink: 0;
  width: 690px;
  margin-right: 10px;
  margin-left: 10px;
  position: relative;
  border: none;
  background: white;
  box-shadow: 0 5px 10px #00000020; 
  border-radius: 4px;
}
legend { font-size: 2rem; border-radius: 4px; box-shadow: 0 2px 6px #00000004; background: white; padding: 0 .7rem; transform: rotate(-1deg); }
fieldset.submit-page, fieldset.overview-page {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

nav {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
}
nav a:nth-child(2) { margin-left: var(--buttonSize)}
nav a svg { width: var(--buttonSize); height: var(--buttonSize); }
    `;
    const style = document.createElement('style');
    style.innerHTML = css;
    style.id = 'injected-css';
    document.head.appendChild(style);
}
}

