This is a simple survey generator that posts results using a standard form post (storing in SCORM is a work-in-progress). It supports text entry, dropdowns, likert ranges, multiple choices, true/false questions, labels, paging, and probably other things.

It does NOT have conditional logic, branching paths, esoteric abstractions, AI integration up-the-wazoo like many other survey systems. This is not a survey system. It's a glorified form helper.

The survey uses a simple parsed language to turn plain text into the survey questions, so you don't have to know any code. It renders using standard html form controls and concepts.

* There is no concept of numbered questions, only responses.
* Questions can be grouped by adding a 'page:' identifier, which results in subsequent questions being part of a new fieldset, and are only a visual change (does not appear in results).
* Statements can be grouped by dichotomy.
* Lines without a type are ignored.
* Unanswered questions are reported as empty.
* There is no concept of required items.
* Results are in the format statement:answer or statement:answer1,answer2,answerN.
* you can use a service like formsubmit.co to capture responses (or wait till I implement Scorm!)

The survey is generated from plain text.

{{download::example}}

## example

{{embed::example}}

Initialisation code used in this example:

```text
the url is where it submits to
url: https://formsubmit.co/b6a16f20c30551573ce803b59fc63704

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
What? This statement has no numeric value.

fillin:[1]
What is your name

fillin:[5]
Tell something personal about yourself

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

```