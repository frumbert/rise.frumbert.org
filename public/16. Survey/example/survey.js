window.addEventListener("DOMContentLoaded", () => {

    // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
    // var qs = new URLSearchParams(location.search);
    // for (const p of qs) {
    //     const d = document.querySelector(`[name=${p[0]}]`); console.log(`[name=${p[0]}]`,d);
    //     if (d && d.value === p[1]) d.checked = true;
    // }

    const uid=function(){return ('q'+1e11).replace(/[018]/g, c =>(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))}
    const crc32=function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};
    const supportedTypes = ['likert','truefalse','choice','choices','matching','dropdown','numeric','choices','fillin','label','page','url'];
    const input = document.querySelector("textarea"); 

    const form = document.createElement("form");
    form.method = "POST";

    const output = document.createDocumentFragment();
    output.appendChild(form);

    /*
    we are turning lines of plain text into object that are like this:
    {
      type: "choice", // or likert, truefalse, etc.
      lines: [ "Question text 1", "Question text 2", ... ],
      dichotomies: [ "Yes", "No" ] // or [ ["A", "Option A"], ["B", "Option B"] ] if using '='
    }
    */
    let regex = /^\s*\r?\n/gm; // start-of-line + optional whitespace + one-or-more newlines
    const questions = input.value
                        .split(regex) // raw input into blocks of lines
                        .filter(((value) => {
                            // Only keep lines with a colon and a supported type
                            return value.indexOf(':') !== -1 && supportedTypes.indexOf(value.split(":").map(s=>s.trim())[0]) !== -1; // filter to only supportedTypes
                        }))
                        .map((value) => {
                             // Split into type and the rest (everything after the first colon)
                             const ind = value.indexOf(':');
                             const [type,rest] = [value.slice(0,ind).trim(), value.slice(ind+1).trim()];
                          // const [type,rest] = value.split(":", 2).map(s=>s.trim());

                            // The first line after the colon is dichotomies (choices/options), the rest are question lines
                            const [dichotomies,...lines] = rest.split(/\r?\n/);
                            return {
                                type,
                                lines: lines.map(s=>s.trim()).filter(s=>s.length),
                                // Parse dichotomies: remove brackets, split by comma, trim, filter empty, and split on '=' if present, and trim either side of the =
                                // replace allows for input like [Yes,No] or Yes,No.
                                dichotomies: dichotomies.replace(/^\[+|\]+$/g,'')
                                  .split(',')
                                  .map(s=>s.trim())
                                  .filter(s=>s.length)
                                  .map(s=>{return s.indexOf("=")!==-1?s.split("=").map(t=>t.trim()):s}),
                            }
                        });

    let fieldset = document.createElement("fieldset");
    fieldset.classList.add("overview-page");
    fieldset.innerHTML = "<h1>To begin the survey, click the button below.</h1>"
    form.appendChild(fieldset);

    fieldset = document.createElement("fieldset");
    form.appendChild(fieldset);

    const inputs = [];
    for (question of questions) {
        let tag;
        switch (question.type) {

            case 'url':
              form.setAttribute('action', question.dichotomies.join(''));
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
                    inputs.push(name);
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
                    inputs.push(tag.name);
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
                    inputs.push(tag.name);
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
                    inputs.push(tag.name);
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
                    inputs.push(tag.name);
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
                    inputs.push(tag.name);
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
                    inputs.push(tag.name);
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
                    inputs.push(tag.name);
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

            break;
        }
    }

    let submitButton = `<p><input type='submit' name='action' value='Submit'></p>`;

    fieldset = document.createElement("fieldset");
    fieldset.classList.add("submit-page");
    fieldset.innerHTML = submitButton;
    form.appendChild(fieldset);

    const fieldsets = form.querySelectorAll('fieldset');
    fieldsets.forEach((fieldset,i) => {
      fieldset.style.height = 'calc(100vh - 20px)';
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

    document.body.appendChild(output);
    input.remove();

    function unique(value,index,array) {
        return self.indexOf(value)===index;
    }

    function plain(text) {
        const d = document.createElement('div');
        d.innerHTML = text;
        return d.textContent || '';
    }

    function fragment(string) {
        const renderer = document.createElement('template');
        renderer.innerHTML = string;
        return renderer.content;
    }

    function label(question) {
        const tag = [`<div data-type="label">`];
        tag.push(`<div class='header'>${question.dichotomies.at(0)}</div>`);
        for (line of question.lines) tag.push(`<div>${line}</div>`);
        tag.push('</div>');
        return { node: fragment(tag.join``) };    
    }

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
            tag.push(`<textarea rows="${value}" cols="80" id="${id}" name="${name}"></textarea>`);
        }
        tag.push('</div>');
        return { id, name, node: fragment(tag.join``) };
    }

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
            tag.push(`<select id="${id}_${i}" name="${name}" onchange='checkMatching(this)'>`);
            tag.push(`<option value="">-</option>`);
            right.map((item) => {
                tag.push(`<option value="${item}">${item}</option>`);
            });
            tag.push('</select></span>');
        });
        tag.push('</div>');
        return { id, name, node: fragment(tag.join``) };
    }

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
            if (node.value.length) values.push(`option[value='${node.value}']`);
        });
        if (values.length) siblings.forEach(node => {
            Array.from(node.querySelectorAll(values.join())).forEach(o => { !o.selected && o.setAttribute("disabled",true); });
        });
    }

    /* here's where the form goes */

    form.addEventListener('submit',e => {
        e.preventDefault();
        const source = new URLSearchParams(new FormData(form));
        const fields = {};
        for (const name of inputs) {
            if (!name.length) continue;
            const [fn,...opts] = source.getAll(name);
            fields[plain(fn)] = opts.join();
        }
        if (form.hasAttribute('action')) { // fire-and-forget
          const actionUrl = form.getAttribute('action');
          fetch(actionUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fields),
              credentials: 'omit'
          });
          // const payload = new Blob([JSON.stringify(fields)], { type: 'application/json' });
          // navigator.sendBeacon(actionUrl, payload); // nah, because of credential is always 'same-origin'
        } else {

        }
        console.log(fields); // SAVE this to a SCORM interaction
    });

});