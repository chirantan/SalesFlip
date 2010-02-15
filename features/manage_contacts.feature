Feature: Manage contacts
  In order to keep track of contacts
  A User
  wants to manage contacts

  Scenario: Adding a contact when the account exists
    Given I am registered and logged in as annika
    And an account: "careermee" exists
    And I am on the new contact page
    And I select "CareerMee" from "contact_account_id"
    And I fill in "contact_first_name" with "Florian"
    And I fill in "contact_last_name" with "Behn"
    When I press "contact_submit"
    Then I should be on the contact page
    And I should see "Florian Behn"
    And account: "careermee" should have a contact with first_name: "Florian"

  Scenario: Adding a contact when the account does not exist
    Given I am registered and logged in as annika
    And I am on the new contact page
    And I follow "new_account"
    And I fill in "account_name" with "World Dating"
    And I press "account_submit"
    And I fill in "contact_first_name" with "Florian"
    And I fill in "contact_last_name" with "Behn"
    And I select "World Dating" from "contact_account_id"
    When I press "contact_submit"
    Then I should be on the contact page
    And I should see "Florian Behn"
    And I should see "World Dating"
    And an account should exist with name: "World Dating"
    And a contact should exist with first_name: "Florian", last_name: "Behn"

  Scenario: Viewing contacts
    Given I am registered and logged in as annika
    And a contact: "Florian" exists with user: annika
    And I am on the dashboard page
    When I follow "contacts"
    Then I should see "Florian Behn"