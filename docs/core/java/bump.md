#!/bin/bash
echo "Updating Maven dependencies to latest versions..."
mvn versions:display-dependency-updates
mvn versions:use-latest-versions
mvn versions:update-parent
echo "Building project with updated dependencies..."
mvn clean install