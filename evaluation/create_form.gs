/**
 * Builds the CampusSpot questionnaire as a Google Form.
 * How to use: go to script.google.com > New project > paste this whole file > press Run (function buildForm)
 * > allow access when asked > open View > Logs (or Executions) to see the form links.
 * Question titles start with a code (CODE, SUS1, TLX1, P1 ...). Keep those codes: from_form.py reads them.
 */
function buildForm() {
  var form = FormApp.create('CampusSpot study: questionnaire');
  form.setDescription(
    'Thank you for helping with my HCI course project at IBA. You will use a prototype app, then answer these questions. ' +
    'It takes about 15 minutes in total. We are testing the app, not you. Nothing here asks for your name or any personal details.\n\n' +
    'Step 1: open the study link on your phone and do the 6 tasks.\n' +
    'Step 2: at the end the app shows a results code. Copy it.\n' +
    'Step 3: come back here and paste it in the first box, then answer the rest.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Thank you! Your answers have been recorded.');

  function choice(title, options, required) {
    form.addMultipleChoiceItem().setTitle(title).setChoiceValues(options).setRequired(required !== false);
  }
  function scale(title, lo, hi, loLabel, hiLabel) {
    form.addScaleItem().setTitle(title).setBounds(lo, hi).setLabels(loLabel, hiLabel).setRequired(true);
  }
  function para(title, help, required) {
    var it = form.addParagraphTextItem().setTitle(title).setRequired(!!required);
    if (help) it.setHelpText(help);
  }
  function page(title, desc) {
    var p = form.addPageBreakItem().setTitle(title);
    if (desc) p.setHelpText(desc);
  }

  // ---- Page 1: code and background
  var code = form.addParagraphTextItem().setTitle('CODE. Results code from the app').setRequired(true);
  code.setHelpText('Starts with CS1. Paste the whole thing. If you did not reach the end, paste nothing here and tell us in the last question.');
  choice('DRIVES. Do you drive or ride a motorbike to campus?', ['Yes, usually', 'Sometimes', 'No']);
  choice('LIB. How often do you use the library?', ['Daily', 'Weekly', 'Rarely', 'Never']);
  choice('SURVEY. Did you answer my earlier short CampusSpot survey (about parking and seats)?', ['Yes', 'No', 'Not sure']);
  choice('DEVICE. What did you use for the tasks?', ['Phone', 'Tablet', 'Laptop or desktop']);

  // ---- Page 2: SUS
  page('About the app: usability', 'Rate each statement from 1 (strongly disagree) to 5 (strongly agree), thinking about the whole app.');
  var sus = [
    'I think that I would like to use this system frequently.',
    'I found the system unnecessarily complex.',
    'I thought the system was easy to use.',
    'I think that I would need the support of a technical person to be able to use this system.',
    'I found the various functions in this system were well integrated.',
    'I thought there was too much inconsistency in this system.',
    'I would imagine that most people would learn to use this system very quickly.',
    'I found the system very cumbersome to use.',
    'I felt very confident using the system.',
    'I needed to learn a lot of things before I could get going with this system.'
  ];
  sus.forEach(function (t, i) { scale('SUS' + (i + 1) + '. ' + t, 1, 5, 'Strongly disagree', 'Strongly agree'); });

  // ---- Page 3: workload
  page('About the tasks: how demanding were they?', 'Rate each from 0 (very low) to 10 (very high).');
  var tlx = [
    ['Mental demand. How mentally demanding were the tasks?', 'Very low', 'Very high'],
    ['Physical demand. How physically demanding were the tasks?', 'Very low', 'Very high'],
    ['Temporal demand. How hurried or rushed did you feel?', 'Very low', 'Very high'],
    ['Performance. How successful were you in doing what you were asked?', 'Perfect', 'Failure'],
    ['Effort. How hard did you have to work to reach your level of performance?', 'Very low', 'Very high'],
    ['Frustration. How insecure, discouraged, irritated or annoyed were you?', 'Very low', 'Very high']
  ];
  tlx.forEach(function (t, i) { scale('TLX' + (i + 1) + '. ' + t[0], 0, 10, t[1], t[2]); });

  // ---- Page 4: design questions
  page('About how the app looked, felt and showed information', 'Rate each from 1 (strongly disagree) to 5 (strongly agree).');
  var items = [
    'P1. The "updated n minutes ago" text helped me decide whether to trust what I saw.',
    'P2. A grey desk was easy to understand as "not reported".',
    'P3. I could tell taken from free without relying on colour alone.',
    'P4. I would report my own desk or parking in the real app.',
    'P5. The app looked pleasant and clear.',
    'P6. I felt in control while using the app.',
    'P7. Helping other students by reporting felt worthwhile.',
    'NAV1. I could always tell where I was in the app.',
    'NAV2. I could always tell how to get back.'
  ];
  items.forEach(function (t) { scale(t, 1, 5, 'Strongly disagree', 'Strongly agree'); });

  // ---- Page 5: comparison and open questions
  page('Last few questions');
  choice('H3. Imagine the library screen in two versions. Version A shows only the map of desks (red, green, grey). Version B shows the same map with a "Busy" or "Quiet" label at the top. Which would you rather use to decide where to go?',
    ['Version A (map only)', 'Version B (map and label)', 'No preference']);
  para('H3WHY. Why?', null, false);
  para('OPEN1. What was the easiest and the hardest thing in the app?', null, true);
  para('OPEN2. When you saw a grey desk, what did you think it meant?', null, true);
  para('OPEN3. Would you trust this app enough to walk to the library because of it? What would make you trust it more?', null, true);
  para('OPEN4. Would you report your own desk or parking in the real app? What would stop you?', null, true);
  para('OPEN5. Anything else, including problems you had opening the app or finishing the tasks?', null, false);

  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Send participants this link: ' + form.getPublishedUrl());
  // Responses: open the form > Responses > Link to Sheets, then File > Download > CSV.
}
