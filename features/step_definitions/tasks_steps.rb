Given /^the following tasks:$/ do |tasks|
  Tasks.create!(tasks.hashes)
end

When /^I delete the (\d+)(?:st|nd|rd|th) tasks$/ do |pos|
  visit tasks_url
  within("table tr:nth-child(#{pos.to_i+1})") do
    click_link "Destroy"
  end
end

Then /^I should see the following tasks:$/ do |expected_tasks_table|
  expected_tasks_table.diff!(tableish('table tr', 'td,th'))
end

Then /^the task "(.+)" should have been completed$/ do |name|
  assert Task.find_by_name(name).completed?
end

Then /^a task re\-assignment email should have been sent to "([^\"]*)"$/ do |email_address|
  assert_sent_email do |email|
    email.to.include?(email_address) && email.body.match(/\/tasks\//)
  end
end
