# VarADL Studio

VarADL Studio is a web-based prototype for modeling **software architectures with integrated variability** in the context of **Software Product Lines (SPL)**.

The tool implements the concepts introduced in the master's thesis:

> *Expression of Variability in an Architecture Description Language (ADL)*  
> University of Namur – Master in Computer Science

VarADL extends traditional Architecture Description Languages by allowing **variability to be expressed directly inside architectural models**, rather than using external feature models.

---

# Online Demo

A live version of the prototype is available at:

https://thierrySiko.github.io/varadl-studio/

---

# Main Features

VarADL Studio provides the following capabilities:

### Architecture Modeling
- Define **components**
- Define **ports**
- Define **connectors**
- Describe the **core architecture**

### Variability Modeling
- Define **variation points**
- Define **variants**
- Support for:
  - `alternative`
  - `optional`
  - `or`

### Constraints
- `requires`
- `excludes`

### Product Derivation
Generate product architectures automatically from:
- an SPL architecture
- a configuration

### Visualization

The prototype provides multiple graphical views:

**Feature Model Graph**
- Variation points
- Variants

**SPL Architecture Graph**
- Core architecture
- Variability fragments

**Derived Product Architecture**
- Final generated architecture

Interactive graph capabilities:
- drag & drop nodes
- connect components
- automatic layout
- constraint visualization

---

# Example VarADL Model

Example architecture:
