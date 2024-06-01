#!/bin/bash

cd WebApplication
npm run build

cd ..

cd build

cmake -DALLOW_DOWNLOADS=ON -DCMAKE_BUILD_TYPE:STRING=Debug -DORTHANC_FRAMEWORK_DEFAULT_SOURCE=path -DORTHANC_FRAMEWORK_ROOT=../../../orthanc/OrthancFramework/Sources -DSTATIC_BUILD=ON ..
make

cd ..

