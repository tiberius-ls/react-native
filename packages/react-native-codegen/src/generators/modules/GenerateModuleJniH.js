/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';

import type {SchemaType} from '../../CodegenSchema';

type FilesOutput = Map<string, string>;

const {getModules} = require('./Utils');

const moduleSpecTemplate = `/**
 * JNI C++ class for module '::_CODEGEN_MODULE_NAME_::'
 */
class JSI_EXPORT ::_CODEGEN_MODULE_NAME_::SpecJSI : public JavaTurboModule {
public:
  ::_CODEGEN_MODULE_NAME_::SpecJSI(const JavaTurboModule::InitParams &params);
};
`;

const template = `
/**
 * ${'C'}opyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ${'@'}generated by codegen project: GenerateModuleJniH.js
 */

#pragma once

#include <ReactCommon/JavaTurboModule.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook {
namespace react {

::_MODULES_::

std::shared_ptr<TurboModule> ::_LIBRARY_NAME_::_ModuleProvider(const std::string moduleName, const JavaTurboModule::InitParams &params);

} // namespace react
} // namespace facebook
`;

const androidMkTemplate = `# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := ::_LIBRARY_NAME_::

LOCAL_C_INCLUDES := $(LOCAL_PATH)

LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/*.cpp)

LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)

LOCAL_SHARED_LIBRARIES := libreact_nativemodule_core

LOCAL_STATIC_LIBRARIES := libjsi

LOCAL_CFLAGS := \\
  -DLOG_TAG=\\"ReactNative\\"

LOCAL_CFLAGS += -fexceptions -frtti -std=c++14 -Wall

include $(BUILD_SHARED_LIBRARY)
`;

module.exports = {
  generate(
    libraryName: string,
    schema: SchemaType,
    moduleSpecName: string,
  ): FilesOutput {
    const nativeModules = getModules(schema);
    const modules = Object.keys(nativeModules)
      .filter(codegenModuleName => {
        const module = nativeModules[codegenModuleName];
        return !(
          module.excludedPlatforms != null &&
          module.excludedPlatforms.includes('android')
        );
      })
      .sort()
      .map(codegenModuleName =>
        moduleSpecTemplate.replace(
          /::_CODEGEN_MODULE_NAME_::/g,
          codegenModuleName,
        ),
      )
      .join('\n');

    const fileName = `${moduleSpecName}.h`;
    const replacedTemplate = template
      .replace(/::_MODULES_::/g, modules)
      .replace(/::_LIBRARY_NAME_::/g, libraryName);
    return new Map([
      [fileName, replacedTemplate],
      [
        'Android.mk',
        androidMkTemplate.replace(
          /::_LIBRARY_NAME_::/g,
          `react_codegen_${libraryName.toLowerCase()}`,
        ),
      ],
    ]);
  },
};