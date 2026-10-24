Feature: Time slips from the map's history

  Past maps of the same place show what has gone and what was called something else.
  Streets here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader starts part way along Long Street

  Scenario: Something gone from the map is remembered
    Given the map of 2017-01-01 had a bakery called "Crumb" right beside the reader
    When the game begins
    Then it says "there was a bakery"
    And it says "January 2017"
    And it does not say "there is a bakery"

  Scenario: A renamed place makes the narrator correct itself
    Given the map of 2017-01-01 called the pub "The Anchor"
    When the game begins
    Then it says "“The Sextant”"
    And it says "“The Anchor”"

  Scenario: What has gone can be examined
    Given the map of 2017-01-01 had a bakery called "Crumb" right beside the reader
    When the reader types "x crumb"
    Then it says "was:shop=bakery"
