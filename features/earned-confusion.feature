@snapshot
Feature: Earned confusion on Lower Addiscombe Road

  Background:
    Given the OSM snapshot dated "2026-10-24" for Addiscombe

  Scenario: A broken name is spoken as found
    Given way 26605222 has old_name "est Bank" and disused:amenity "bank"
    When the reader stands outside "209-213 Lower Addiscombe Road"
    Then the narration mentions "est Bank"
    And the narration does not repair it to another name

  @icebox
  Scenario: A second source contradicts the map
    Given a curated note that NatWest closed its branch at 209 Lower Addiscombe Road in January 2023
    When the reader stands outside "209-213 Lower Addiscombe Road"
    Then the narration contains a self-correction between "est Bank" and "NatWest"

  @history
  Scenario: The bank's other name surfaces from the map's history
    Given the past maps of Addiscombe
    And node 1880285965 was called "NatWest" in the map of 2021-01-01 and carries no tags now
    When the reader stands outside "209-213 Lower Addiscombe Road"
    Then the narration mentions "est Bank"
    And the narration mentions "NatWest"

  Scenario: An old survey slips the tense
    Given "223-227 Lower Addiscombe Road" carry survey:date "2018-10-04"
    When the reader stands outside "225 Lower Addiscombe Road"
    Then the narration of those shops contains a tense slip

  Scenario: A sparse street makes the narrator hesitate
    Given Everton Road has only highway, lanes, lit, maxspeed, sidewalk, and surface tags
    And no buildings are mapped along it
    When the reader is on Everton Road
    Then the narration speaks of surface, lighting, and speed
    And the narration hesitates or falls silent
    And the narration does not place the button factory on Everton Road

  @history
  Scenario: The old bank is told once, with what the map remembers of it
    Given the past maps of Addiscombe
    When the reader stands outside "209-213 Lower Addiscombe Road"
    Then the narration mentions "NatWest"
    And the narration mentions "est Bank"
    And the narration does not mention "there was a bank"
