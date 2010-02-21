Feature: Manage tasks
  In order to remember to do jobs
  A User
  wants to add, update, delete and be reminded of tasks

  Scenario: Creating a new task
    Given I am registered and logged in as annika
    And I am on the tasks page
    And I follow "new"
    And I fill in "task_name" with "a test task"
    And I select "Call" from "task_category"
    When I press "task_submit"
    Then I should be on the tasks page
    And I should see "a test task"

  Scenario: Viewing my tasks
    Given I am registered and logged in as annika
    And a task exists with user: annika, name: "Task for Annika"
    And user: "benny" exists
    And a task exists with user: benny, name: "Task for Benny"
    When I go to the tasks page
    Then I should see "Task for Annika"
    And I should not see "Task for Benny"

  Scenario: Re-assiging a task
    Given I am registered and logged in as annika
    And user: "benny" exists with email: "benjamin.pochhammer@1000jobboersen.de"
    And a task: "call_erich" exists with user: annika
    And I am on the task's edit page
    When I select "benjamin.pochhammer@1000jobboersen.de" from "task_assignee_id"
    And I press "task_submit"
    Then I should be on the tasks page
    And I should see "Task has been re-assigned"
    And a task re-assignment email should have been sent to "benjamin.pochhammer@1000jobboersen.de"

  Scenario: Filtering pending tasks
    Given I am registered and logged in as annika
    And a task: "call_erich" exists with user: annika
    And a task exists with user: annika, name: "test task", completed_at: "12th March 2000"
    And I am on the tasks page
    When I follow "pending"
    Then I should see "erich"
    And I should not see "test task"

  Scenario: Filtering assigned tasks
    Given I am registered and logged in as annika
    And a user: "benny" exists
    And a task: "call_erich" exists with user: annika
    And a task exists with user: annika, assignee: annika, name: "annika's task"
    And a task exists with user: benny, assignee: benny, name: "benny's task"
    And a task exists with user: benny, assignee: annika, name: "task for annika"
    When I am on the tasks page
    And I follow "assigned"
    Then I should not see "Erich"
    And I should see "annika's task"
    And I should not see "benny's task"
    And I should see "task for annika"

  Scenario: Filtering overdue pending tasks
    Given I am registered and logged in as annika
    And a task: "call_erich" exists with user: annika, due_at: "overdue"
    And a task exists with user: annika, name: "another task", due_at: "due_next_week"
    When I am on the tasks page
    And I follow "pending"
    And I check "overdue"
    And I press "filter"
    Then I should see "erich"
    And I should not see "another task"

  Scenario: Filtering pending tasks due today
    Given I am registered and logged in as annika
    And a task "call_erich" exists with user: annika, due_at: "due_today"
    And a task exists with user: annika, name: "another task", due_at: "due_next_week"
    When I am on the tasks page
    And I follow "pending"
    And I check "due_today"
    And I press "filter"
    Then I should see "erich"
    And I should not see "another task"

  Scenario: Filtering pending tasks due tomorrow
    Given I am registered and logged in as annika
    And a task "call_erich" exists with user: annika, due_at: "due_tomorrow"
    And a task exists with user: annika, name: "another task", due_at: "due_next_week"
    When I am on the tasks page
    And I follow "pending"
    And I check "due_tomorrow"
    And I press "filter"
    Then I should see "erich"
    And I should not see "another task"

  Scenario: Filtering pending tasks due next week
    Given I am registered and logged in as annika
    And a task: "call_erich" exists with user: annika, due_at: "overdue"
    And a task exists with user: annika, name: "another task", due_at: "due_next_week"
    When I am on the tasks page
    And I follow "pending"
    And I check "due_next_week"
    And I press "filter"
    Then I should see "another task"
    And I should not see "erich"

  Scenario: Filtering pending tasks due later
    Given I am registered and logged in as annika
    And a task: "call_erich" exists with user: annika, due_at: "overdue"
    And a task exists with user: annika, name: "another task", due_at: "due_later"
    When I am on the tasks page
    And I follow "pending"
    And I check "due_later"
    And I press "filter"
    Then I should see "another task"
    And I should not see "erich"
