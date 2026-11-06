Feature: Personal data in the Guide

  Personal detail the walk does not need never reaches the prose, the narration kept in the
  repository, or the page: it is taken out where it is fetched. Streets, houses, people and
  records here are invented.

  Background:
    Given an invented street called "Example Road" with houses numbered 2 to 16

  Scenario: Planning applicant names are never narrated
    Given a planning application with applicant "Mr J Smith" at 12 Example Road
    When the Guide narrates Example Road
    Then the narration does not contain "Smith"
    And the data sent to the LLM contains no applicant or agent fields

  Scenario: Names in planning descriptions are removed
    Given a planning description "Rear extension for Mrs A Jones"
    When the record is ingested
    Then the stored description is "Rear extension"
    And the removal is logged

  Scenario: No address-level sale prices
    Given Example Road has 8 sales since 2020, including 12 Example Road for £482,500
    When the Guide narrates Example Road
    Then the narration does not contain "£482,500"
    And the narration does not link any sale to a house number
    And the narration gives a range rounded to the nearest £25,000

  Scenario: Streets with few sales say nothing about prices
    Given an invented street called "Quiet Close" with houses numbered 1 to 7
    And Quiet Close has 3 sales since 2020
    When the Guide narrates Quiet Close
    Then the narration does not mention sale prices

  Scenario: Removal survives a data refresh
    Given a planning application "Invented garden room" at 12 Example Road
    And prose was written for Example Road while that record was told
    And 12 Example Road's planning record is on the suppression list
    When the data is refreshed from source
    And the Guide narrates Example Road
    Then that planning record is not narrated
    And no cached narration for it remains

  Scenario: Residents can find how to request removal
    Given a player on any page
    When they open "Remove something" from the footer or type "help"
    Then they see what data is used, where it comes from, and the removal email address
