Feature: Another account, from Wikidata

  Wikidata holds what the map links to, and things the map does not have.
  Its facts carry their own source, and Guide never passes them off as the map's.
  Streets, items and people here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader starts part way along Long Street

  Scenario: A street named for someone says who
    Given Long Street is named for "Ada Inventa", described in Wikidata as "invented engineer"
    When the game begins
    Then it says "Named for Ada Inventa, invented engineer."

  Scenario: A thing the map links to is described elsewhere
    Given Wikidata describes The Sextant as "invented public house"
    When the game begins
    Then it says "Described as “invented public house”."

  Scenario: Something Wikidata places here that the map does not have
    Given Wikidata places "The Old Invented Works", "former invented factory", right beside the reader
    When the game begins
    Then it never calls it another account, nor hearsay
    And it says "“The Old Invented Works”"

  Scenario: Wikidata's facts keep their source when examined
    Given Wikidata describes The Sextant as "invented public house"
    When the reader types "x sextant"
    Then it says "Described as “invented public house”."
    And it does not say "="
