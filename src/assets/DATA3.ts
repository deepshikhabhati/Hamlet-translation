export const Data3 = {
    "quantum Computing": {
        "umap_values": [
            {
                "text": "A quantum computer is a computer that exploits quantum mechanical phenomena. On small scales, physical matter exhibits properties of both particles and waves, and quantum computing leverages this behavior using specialized hardware. Classical physics cannot explain the operation of these quantum devices, and a scalable quantum computer could perform some calculations exponentially faster[a] than any modern 'classical' computer. Theoretically a large-scale quantum computer could break some widely used encryption schemes and aid physicists in performing physical simulations; however, the current state of the art is largely experimental and impractical, with several obstacles to useful applications.",
                "umap_x": 0.6409709453582764,
                "umap_y": 1.0979664325714111,
                "color": "#FF7F0E"
            },
            {
                "text": "The basic unit of information in quantum computing, the qubit (or 'quantum bit'), serves the same function as the bit in classical computing. However, unlike a classical bit, which can be in one of two states (a binary), a qubit can exist in a superposition of its two 'basis' states, a state that is in an abstract sense 'between' the two basis states. When measuring a qubit, the result is a probabilistic output of a classical bit. If a quantum computer manipulates the qubit in a particular way, wave interference effects can amplify the desired measurement results. The design of quantum algorithms involves creating procedures that allow a quantum computer to perform calculations efficiently and quickly.",
                "umap_x": -0.3817142844200134,
                "umap_y": 1.4159948825836182,
                "color": "#FF7F0E"
            },
            {
                "text": "Quantum computers are not yet practical for real work. Physically engineering high-quality qubits has proven challenging. If a physical qubit is not sufficiently isolated from its environment, it suffers from quantum decoherence, introducing noise into calculations. National governments have invested heavily in experimental research that aims to develop scalable qubits with longer coherence times and lower error rates. Example implementations include superconductors (which isolate an electrical current by eliminating electrical resistance) and ion traps (which confine a single atomic particle using electromagnetic fields).",
                "umap_x": 0.473326712846756,
                "umap_y": 0.42183440923690796,
                "color": "#FF7F0E"
            },
            {
                "text": "In principle, a classical computer can solve the same computational problems as a quantum computer, given enough time. Quantum advantage comes in the form of time complexity rather than computability,and quantum complexity theory shows that some quantum algorithms are exponentially more efficient than the best-known classical algorithms. A large-scale quantum computer could in theory solve computational problems unsolvable by a classical computer in any reasonable amount of time. This concept of extra ability has been called 'quantum supremacy'. While such claims have drawn significant attention to the discipline, near-term practical use cases remain limited",
                "umap_x": 0.7294812798500061,
                "umap_y": 1.7135294675827026,
                "color": "#FF7F0E"
            }
        ],
        "color": "#FF7F0E"
    },
    "History": {
        "color": "#0D9494",
        "umap_values": [
            {
                "text": "For many years, the fields of quantum mechanics and computer science formed distinct academic communities.[1] Modern quantum theory developed in the 1920s to explain perplexing physical phenomena observed at atomic scales,[2][3] and digital computers emerged in the following decades to replace human computers for tedious calculations.[4] Both disciplines had practical applications during World War II; computers played a major role in wartime cryptography,[5] and quantum physics was essential for nuclear physics used in the Manhattan Project.[6]",
                "umap_x": 1.4099713563919067,
                "umap_y": 1.0305932760238647,
                "color": "#0D9494"
            },
            {
                "text": "As physicists applied quantum mechanical models to computational problems and swapped digital bits for qubits, the fields of quantum mechanics and computer science began to converge. In 1980, Paul Benioff introduced the quantum Turing machine, which uses quantum theory to describe a simplified computer.[7] When digital computers became faster, physicists faced an exponential increase in overhead when simulating quantum dynamics,[8] prompting Yuri Manin and Richard Feynman to independently suggest that hardware based on quantum phenomena might be more efficient for computer simulation.[9][10][11] In a 1984 paper, Charles Bennett and Gilles Brassard applied quantum theory to cryptography protocols and demonstrated that quantum key distribution could enhance information security.[12][13]",
                "umap_x": 0.995061993598938,
                "umap_y": 1.367984414100647,
                "color": "#0D9494"
            },
            {
                "text": "Quantum algorithms then emerged for solving oracle problems, such as Deutsch's algorithm in 1985,[14] the Bernstein–Vazirani algorithm in 1993,[15] and Simon's algorithm in 1994.[16] These algorithms did not solve practical problems, but demonstrated mathematically that one could gain more information by querying a black box with a quantum state in superposition, sometimes referred to as quantum parallelism.[17]",
                "umap_x": 1.0981930494308472,
                "umap_y": 2.0849719047546387,
                "color": "#0D9494"
            },
            {
                "text": "Peter Shor built on these results with his 1994 algorithm for breaking the widely used RSA and Diffie–Hellman encryption protocols,[18] which drew significant attention to the field of quantum computing. In 1996, Grover's algorithm established a quantum speedup for the widely applicable unstructured search problem.[19][20] The same year, Seth Lloyd proved that quantum computers could simulate quantum systems without the exponential overhead present in classical simulations,[21] validating Feynman's 1982 conjecture.[22]",
                "umap_x": 1.5697726011276245,
                "umap_y": 2.1224076747894287,
                "color": "#0D9494"
            },
            {
                "text": "Over the years, experimentalists have constructed small-scale quantum computers using trapped ions and superconductors.[23] In 1998, a two-qubit quantum computer demonstrated the feasibility of the technology,[24][25] and subsequent experiments have increased the number of qubits and reduced error rates.[23]",
                "umap_x": 0.4919540584087372,
                "umap_y": 0.42345884442329407,
                "color": "#0D9494"
            },
            {
                "text": "In 2019, Google AI and NASA announced that they had achieved quantum supremacy with a 54-qubit machine, performing a computation that is impossible for any classical computer.[26][27][28] However, the validity of this claim is still being actively researched.[29][30]",
                "umap_x": 2.2905447483062744,
                "umap_y": -0.8713347315788269,
                "color": "#0D9494"
            }
        ]
    },
    "Quantum information processing": {
        "umap_values": [
            {
                "text": "Computer engineers typically describe a modern computer's operation in terms of classical electrodynamics. Within these 'classical' computers, some components (such as semiconductors and random number generators) may rely on quantum behavior, but these components are not isolated from their environment, so any quantum information quickly decoheres. While programmers may depend on probability theory when designing a randomized algorithm, quantum mechanical notions like superposition and interference are largely irrelevant for program analysis.",
                "umap_x": 0.028522294014692307,
                "umap_y": 1.5672953128814697,
                "color": "#2CA02C"
            },
            {
                "text": "Quantum programs, in contrast, rely on precise control of coherent quantum systems. Physicists describe these systems mathematically using linear algebra. Complex numbers model probability amplitudes, vectors model quantum states, and matrices model the operations that can be performed on these states. Programming a quantum computer is then a matter of composing operations in such a way that the resulting program computes a useful result in theory and is implementable in practice.",
                "umap_x": 0.055402472615242004,
                "umap_y": 1.6472214460372925,
                "color": "#2CA02C"
            },
            {
                "text": "As physicist Charlie Bennett describes the relationship between quantum and classical computers,[31] A classical computer is a quantum computer ... so we shouldn't be asking about 'where do quantum speedups come from?' We should say, 'well, all computers are quantum. ... Where do classical slowdowns come from?",
                "umap_x": 0.5721837282180786,
                "umap_y": 1.826233983039856,
                "color": "#2CA02C"
            }
        ],
        "color": "#2CA02C"
    },
    "Quantum information": {
        "color": "#d95275",
        "topic": "Quantum information processing",
        "umap_values": [
            {
                "text": "Just as the bit is the basic concept of classical information theory, the qubit is the fundamental unit of quantum information. The same term qubit is used to refer to an abstract mathematical model and to any physical system that is represented by that model. A classical bit, by definition, exists in either of two physical states, which can be denoted 0 and 1. A qubit is also described by a state, and two states often written and serve as the quantum counterparts of the classical states 0 and 1. However, the quantum states and belong to a vector space, meaning that they can be multiplied by constants and added together, and the result is again a valid quantum state. Such a combination is known as a superposition of and .",
                "umap_x": -0.549354612827301,
                "umap_y": 1.3753950595855713,
                "color": "#d95275"
            },
            {
                "text": "A two-dimensional vector mathematically represents a qubit state. Physicists typically use Dirac notation for quantum mechanical linear algebra, writing 'ket psi' for a vector labeled . Because a qubit is a two-state system, any qubit state takes the form , where and are the standard basis states, [b] and and are the probability amplitudes, which are in general complex numbers.[33] If either or is zero, the qubit is effectively a classical bit; when both are nonzero, the qubit is in superposition. Such a quantum state vector acts similarly to a (classical) probability vector, with one key difference: unlike probabilities, probability amplitudes are not necessarily positive numbers.[35] Negative amplitudes allow for destructive wave interference. ",
                "umap_x": -0.6008908748626709,
                "umap_y": 1.391732096672058,
                "color": "#d95275"
            },
            {
                "text": "When a qubit is measured in the standard basis, the result is a classical bit. The Born rule describes the norm-squared correspondence between amplitudes and probabilities—when measuring a qubit , the state collapses to with probability , or to with probability . Any valid Quantum information processing Quantum information qubit state has coefficients and such that . As an example, measuring the qubit  would produce either or with equal probability.",
                "umap_x": -0.5564103126525879,
                "umap_y": 1.4410107135772705,
                "color": "#d95275"
            },
            {
                "text": "Each additional qubit doubles the dimension of the state space. [34] As an example, the vector 1 √2 |00⟩ + 1 √2 |01⟩ represents a two-qubit state, a tensor product of the qubit |0⟩ with the qubit 1 √2 |0⟩ + 1 √2 |1⟩.This vector inhabits a four-dimensional vector space spanned by the basis vectors |00⟩, |01⟩, |10⟩, and |11⟩. The Bell state 1 √2 |00⟩ + 1 √2 |11⟩ is impossible to decompose into the tensor product of two individual qubits—the two qubits are entangled because neither qubit has a state vector of its own. In general, the vector space for an n-qubit system is 2n-dimensional, and this makes it challenging for a classical computer to simulate a quantum one: representing a 100-qubit system requires storing 2100 classical values.",
                "umap_x": -0.5383066534996033,
                "umap_y": 1.312119483947754,
                "color": "#d95275"
            }
        ]
    },
    "Unitary operators": {
        "color": "#9467BD",
        "topic": "Quantum information processing",
        "umap_values": [
            {
                "text": "The state of this one-qubit quantum memory can be manipulated by applying quantum logic gates,analogous to how classical memory can be manipulated with classical logic gates. One important gate for both classical and quantum computation is the NOT gate, which can be represented by a matrix Mathematically, the application of such a logic gate to a quantum state vector is modelled with matrix multiplication. Thus",
                "umap_x": -0.2879612147808075,
                "umap_y": 1.1958420276641846,
                "color": "#9467BD"
            },
            {
                "text": "The mathematics of single qubit gates can be extended to operate on multi-qubit quantum memories in two important ways. One way is simply to select a qubit and apply that gate to the target qubit while leaving the remainder of the memory unaffected. Another way is to apply the gate to its target only if another part of the memory is in a desired state. These two choices can be illustrated using another example. The possible states of a two-qubit quantum memory are",
                "umap_x": -0.3382124900817871,
                "umap_y": 1.255391001701355,
                "color": "#9467BD"
            },
            {
                "text": "In summary, quantum computation can be described as a network of quantum logic gates and measurements. However, any measurement can be deferred to the end of quantum computation, though this deferment may come at a computational cost, so most quantum circuits depict a network consisting only of quantum logic gates and no measurements.",
                "umap_x": -0.004748706705868244,
                "umap_y": 1.4902197122573853,
                "color": "#9467BD"
            }
        ]
    },
    "Quantum parallelism": {
        "color": "#aaaaaa",
        "topic": "Quantum information processing",
        "umap_values": [
            {
                "text": "Quantum parallelism is the heuristic that quantum computers can be thought of as evaluating a function for multiple input values simultaneously. This can be achieved by preparing a quantum system in a superposition of input states and applying a unitary transformation that encodes the function to be evaluated. The resulting state encodes the function's output values for all input values in the superposition, allowing for the computation of multiple outputs simultaneously. This property is key to the speedup of many quantum algorithms. However, 'parallelism' in this sense is insufficient to speed up a computation, because the measurement at the end of the computation gives only one value. To be useful, a quantum algorithm must also incorporate some other conceptual ingredient.",
                "umap_x": 0.8949578404426575,
                "umap_y": 1.8567074537277222,
                "color": "#aaaaaa"
            }
        ]
    },
    "Quantum programming": {
        "color": "#E377C2",
        "topic": "Quantum information processing",
        "umap_values": [
            {
                "text": "The threshold theorem shows how increasing the number of qubits can mitigate errors,[45] yet fully fault- tolerant quantum computing remains \"a rather distant dream\".[46] According to some researchers, noisy intermediate-scale quantum (NISQ) machines may have specialized uses in the near future, but noise in quantum gates limits their reliability.[46] Scientists at Harvard University successfully created \"quantum circuits\" that correct errors more efficiently than alternative methods, which may potentially remove a major obstacle to practical quantum computers.[47][48] The Harvard research team was supported by MIT,QuEra Computing, Caltech, and Princeton University and funded by DARPA's Optimization with Noisy Intermediate-Scale Quantum devices (ONISQ) program.[49][50]",
                "umap_x": 0.6392452716827393,
                "umap_y": 0.7584207057952881,
                "color": "#E377C2"
            }
        ]
    },
    "Gate array": {
        "color": "#7F7F7F",
        "topic": "Quantum information processing",
        "subtopic": "Quantum programming",
        "umap_values": [
            {
                "text": "Any quantum computation (which is, in the above formalism, any unitary matrix of size over qubits) can be represented as a network of quantum logic gates from a fairly small family of gates. A choice of gate family that enables this construction is known as a universal gate set, since a computer that can run such circuits is a universal quantum computer. One common such set includes all single-qubit gates as well as the CNOT gate from above. This means any quantum computation can be performed by executing a sequence of single-qubit gates together with CNOT gates. Though this gate set is infinite, it can be replaced with a finite gate set by appealing to the Solovay-Kitaev theorem. Implementation of Boolean functions using the few-qubit quantum gates is presented here.[38]",
                "umap_x": 0.011396992020308971,
                "umap_y": 1.206082820892334,
                "color": "#7F7F7F"
            },
            {
                "text": "A measurement-based quantum computer decomposes computation into a sequence of Bell state measurements and single-qubit quantum gates applied to a highly entangled initial state (a cluster state), using a technique called quantum gate teleportation.",
                "umap_x": -0.10138361155986786,
                "umap_y": 1.4402333498001099,
                "color": "#7F7F7F"
            }
        ]
    },
    "Measurement-based quantum computing array": {
        "color": "#BCBD22",
        "topic": "Quantum information processing",
        "subtopic": "Quantum programming",
        "umap_values": [
            {
                "text": "Neuromorphic quantum computing (abbreviated as ‘n.quantum computing’) is an unconventional type of computing that uses neuromorphic computing to perform quantum operations. It was suggested that quantum algorithms, which are algorithms that run on a realistic model of quantum computation, can be computed equally efficiently with neuromorphic quantum computing. Both, traditional quantum computing and neuromorphic quantum computing are physics-based unconventional computing approaches to computations and do not follow the von Neumann architecture. They both construct a system (a circuit) that represents the physical problem at hand and then leverage their respective physics properties of the system to seek the “minimum”. Neuromorphic quantum computing and quantum computing share similar physical properties during computation.",
                "umap_x": 0.5785697102546692,
                "umap_y": 1.4183992147445679,
                "color": "#BCBD22"
            }
        ]
    },
    "Adiabatic quantum computing": {
        "color": "#0000ee",
        "topic": "Quantum information processing",
        "subtopic": "Quantum programming",
        "umap_values": [
            {
                "text": "A quantum Turing machine is the quantum analog of a Turing machine.[7] All of these models of computation—quantum circuits,[41] one-way quantum computation,[42] adiabatic quantum computation,[43] and topological quantum computation[44]—have been shown to be equivalent to the quantum Turing machine; given a perfect implementation of one such quantum computer, it can simulate all the others with no more than polynomial overhead. This equivalence need not hold for practical quantum computers, since the overhead of simulation may be too large to be practical.",
                "umap_x": 0.8478159308433533,
                "umap_y": 1.5116512775421143,
                "color": "#0000ee"
            }
        ]
    },
    "Neuromorphic quantum computing": {
        "color": "#AEC7E8",
        "topic": "Quantum information processing",
        "subtopic": "Quantum programming",
        "umap_values": [
            {
                "text": "A quantum gate array decomposes computation into a sequence of few-qubit quantum gates. A quantum computation can be described as a network of quantum logic gates and measurements. However, any measurement can be deferred to the end of quantum computation, though this deferment may come at a computational cost, so most quantum circuits depict a network consisting only of quantum logic gates and no measurements.",
                "umap_x": -0.11153417080640793,
                "umap_y": 1.3837300539016724,
                "color": "#AEC7E8"
            }
        ]
    },
    "Topological quantum computing": {
        "color": "#ff003c",
        "topic": "Quantum information processing",
        "subtopic": "Quantum programming",
        "umap_values": [
            {
                "text": "There are a number of models of computation for quantum computing, distinguished by the basic elements in which the computation is decomposed.",
                "umap_x": 1.5867403745651245,
                "umap_y": 1.2912800312042236,
                "color": "#ff003c"
            }
        ]
    },
    "Noisy intermediate-scale quantum computing": {
        "color": "#FF9896",
        "topic": "Quantum information processing",
        "subtopic": "Quantum programming",
        "umap_values": [
            {
                "text": "A topological quantum computer decomposes computation into the braiding of anyons in a 2D lattice.[40]",
                "umap_x": 2.595975637435913,
                "umap_y": 0.6579962372779846,
                "color": "#FF9896"
            }
        ]
    },
    "Quantum Turing machine": {
        "color": "#98DF8A",
        "topic": "Quantum information processing",
        "subtopic": "Quantum programming",
        "umap_values": [
            {
                "text": "An adiabatic quantum computer, based on quantum annealing, decomposes computation into a slow continuous transformation of an initial Hamiltonian into a final Hamiltonian, whose ground states contain the solution.[39]",
                "umap_x": 1.5349268913269043,
                "umap_y": 1.6885268688201904,
                "color": "#98DF8A"
            }
        ]
    },
    "Quantum cryptography and cybersecurity": {
        "color": "#C5B0D5",
        "topic": "Quantum information processing",
        "umap_values": [
            {
                "text": "Quantum computing has significant potential applications in the fields of cryptography and cybersecurity.Quantum cryptography, which relies on the principles of quantum mechanics, offers the possibility of secure communication channels that are resistant to eavesdropping. Quantum key distribution (QKD)such as BB84, enable the secure exchange of cryptographic keys between parties, ensuring the confidentiality and integrity of communication. Moreover, quantum random number generators (QRNGs) can produce high-quality random numbers, which are essential for secure encryption.",
                "umap_x": 2.4199986457824707,
                "umap_y": 2.673577308654785,
                "color": "#C5B0D5"
            },
            {
                "text": "However, quantum computing also poses challenges to traditional cryptographic systems. Shor's algorithm, a quantum algorithm for integer factorization, could potentially break widely used public-key cryptography schemes like RSA, which rely on the difficulty of factoring large numbers. Post-quantum cryptography, which involves the development of cryptographic algorithms that are resistant to attacks by both classical and quantum computers, is an active area of research aimed at addressing this concern.",
                "umap_x": 1.9515422582626343,
                "umap_y": 2.4417850971221924,
                "color": "#C5B0D5"
            },
            {
                "text": "Ongoing research in quantum cryptography and post-quantum cryptography is crucial for ensuring the security of communication and data in the face of evolving quantum computing capabilities. Advances in these fields, such as the development of new QKD protocols, the improvement of QRNGs, and the standardization of post-quantum cryptographic algorithms, will play a key role in maintaining the integrity and confidentiality of information in the quantum era.[51]",
                "umap_x": 2.479288339614868,
                "umap_y": 2.6752052307128906,
                "color": "#C5B0D5"
            }
        ]
    },
    "Communication": {
        "color": "#C49C94",
        "umap_values": [
            {
                "text": "Quantum cryptography enables new ways to transmit data securely; for example, quantum key distribution uses entangled quantum states to establish secure cryptographic keys.[52] When a sender and receiver exchange quantum states, they can guarantee that an adversary does not intercept the message, as any unauthorized eavesdropper would disturb the delicate quantum system and introduce a detectable change.[53] With appropriate cryptographic protocols, the sender and receiver can thus establish shared private information resistant to eavesdropping.[12][54]",
                "umap_x": 2.303281545639038,
                "umap_y": 2.697122097015381,
                "color": "#C49C94"
            },
            {
                "text": "Modern fiber-optic cables can transmit quantum information over relatively short distances. Ongoing experimental research aims to develop more reliable hardware (such as quantum repeaters), hoping to scale this technology to long-distance quantum networks with end-to-end entanglement. Theoretically, this could enable novel technological applications, such as distributed quantum computing and enhanced quantum sensing.[55][56]",
                "umap_x": 0.3560844361782074,
                "umap_y": 0.8996708393096924,
                "color": "#C49C94"
            }
        ]
    },
    "Algorithms": {
        "color": "#F7B6D2",
        "umap_values": [
            {
                "text": "Progress in finding quantum algorithms typically focuses on this quantum circuit model, though exceptions like the quantum adiabatic algorithm exist. Quantum algorithms can be roughly categorized by the type of speedup achieved over corresponding classical algorithms.[57]",
                "umap_x": 0.9663183093070984,
                "umap_y": 1.9641659259796143,
                "color": "#F7B6D2"
            },
            {
                "text": "Quantum algorithms that offer more than a polynomial speedup over the best-known classical algorithm include Shor's algorithm for factoring and the related quantum algorithms for computing discrete logarithms, solving Pell's equation, and more generally solving the hidden subgroup problem for abelian finite groups.[57] These algorithms depend on the primitive of the quantum Fourier transform. No mathematical proof has been found that shows that an equally fast classical algorithm cannot be discovered, but evidence suggests that this is unlikely.[58] Certain oracle problems like Simon's problem and the Bernstein–Vazirani problem do give provable speedups, though this is in the quantum query model, which is a restricted model where lower bounds are much easier to prove and doesn't necessarily translate to speedups for practical problems.",
                "umap_x": 1.0342055559158325,
                "umap_y": 2.243198871612549,
                "color": "#F7B6D2"
            },
            {
                "text": "Other problems, including the simulation of quantum physical processes from chemistry and solid-state physics, the approximation of certain Jones polynomials, and the quantum algorithm for linear systems of equations have quantum algorithms appearing to give super-polynomial speedups and are BQP-complete. Because these problems are BQP-complete, an equally fast classical algorithm for them would imply that no quantum algorithm gives a super-polynomial speedup, which is believed to be unlikely.[59]",
                "umap_x": 0.8643326759338379,
                "umap_y": 2.1475868225097656,
                "color": "#F7B6D2"
            },
            {
                "text": "Some quantum algorithms, like Grover's algorithm and amplitude amplification, give polynomial speedups over corresponding classical algorithms.[57] Though these algorithms give comparably modest quadratic speedup, they are widely applicable and thus give speedups for a wide range of problems.[20]",
                "umap_x": 0.8020458221435547,
                "umap_y": 2.1565487384796143,
                "color": "#F7B6D2"
            }
        ]
    },
    "Simulation of quantum systems": {
        "color": "#C7C7C7",
        "topic": "Algorithms",
        "umap_values": [
            {
                "text": "Since chemistry and nanotechnology rely on understanding quantum systems, and such systems are impossible to simulate in an efficient manner classically, quantum simulation may be an important application of quantum computing.[60] Quantum simulation could also be used to simulate the behavior of atoms and particles at unusual conditions such as the reactions inside a collider.[61] In June 2023, IBM computer scientists reported that a quantum computer produced better results for a physics problem than a conventional supercomputer",
                "umap_x": 0.9031517505645752,
                "umap_y": 1.0384821891784668,
                "color": "#C7C7C7"
            },
            {
                "text": "About 2% of the annual global energy output is used for nitrogen fixation to produce ammonia for the Haber process in the agricultural fertilizer industry (even though naturally occurring organisms also produce ammonia). Quantum simulations might be used to understand this process and increase the energy efficiency of production.[64] It is expected that an early use of quantum computing will be modeling that improves the efficiency of the Haber–Bosch process[65] by the mid-2020s[66] although some have predicted it will take longer",
                "umap_x": 1.1761139631271362,
                "umap_y": 1.080568790435791,
                "color": "#C7C7C7"
            }
        ]
    },
    "Post-quantum cryptography": {
        "color": "#DBDB8D",
        "topic": "Algorithms",
        "umap_values": [
            {
                "text": "A notable application of quantum computation is for attacks on cryptographic systems that are currently in use. Integer factorization, which underpins the security of public key cryptographic systems, is believed to be computationally infeasible with an ordinary computer for large integers if they are the product of few prime numbers (e.g., products of two 300-digit primes).[68] By comparison, a quantum computer could solve this problem exponentially faster using Shor's algorithm to find its factors.[69] This ability would allow a quantum computer to break many of the cryptographic systems in use today, in the sense that there would be a polynomial time (in the number of digits of the integer) algorithm for solving the problem. In particular, most of the popular public key ciphers are based on the difficulty of factoring integers or the discrete logarithm problem, both of which can be solved by Shor's algorithm. In particular, the RSA, Diffie–Hellman, and elliptic curve Diffie–Hellman algorithms could be broken. These are used to protect secure Web pages, encrypted email, and many other types of data. Breaking these would have significant ramifications for electronic privacy and security.",
                "umap_x": 1.6629867553710938,
                "umap_y": 2.300370454788208,
                "color": "#DBDB8D"
            },
            {
                "text": "Identifying cryptographic systems that may be secure against quantum algorithms is an actively researched topic under the field of post-quantum cryptography.[70][71] Some public-key algorithms are based on problems other than the integer factorization and discrete logarithm problems to which Shor's algorithm applies, like the McEliece cryptosystem based on a problem in coding theory.[70][72] Lattice-based cryptosystems are also not known to be broken by quantum computers, and finding a polynomial time algorithm for solving the dihedral hidden subgroup problem, which would break many lattice based cryptosystems, is a well-studied open problem.[73] It has been proven that applying Grover's algorithm to break a symmetric (secret key) algorithm by brute force requires time equal to roughly 2n/2 invocations of the underlying cryptographic algorithm, compared with roughly 2n in the classical case,[74] meaning that symmetric key lengths are effectively halved: AES-256 would have the same security against an attack using Grover's algorithm that AES-128 has against classical brute-force search ",
                "umap_x": 1.7727727890014648,
                "umap_y": 2.4024205207824707,
                "color": "#DBDB8D"
            }
        ]
    },
    "Search problems": {
        "color": "#9EDAE5",
        "topic": "Algorithms",
        "umap_values": [
            {
                "text": "The most well-known example of a problem that allows for a polynomial quantum speedup is unstructured search, which involves finding a marked item out of a list of  items in a database. This can be solved by Grover's algorithm using queries to the database, quadratically fewer than the queries required for classical algorithms. In this case, the advantage is not only provable but also optimal: it has been shown that Grover's algorithm gives the maximal possible probability of finding the desired element for any number of oracle lookups. Many examples of provable quantum speedups for query problems are based on Grover's algorithm, including Brassard, Høyer, and Tapp's algorithm for finding collisions in two-to-one functions,[75] and Farhi, Goldstone, and Gutmann's algorithm for evaluating NAND trees",
                "umap_x": 1.1857678890228271,
                "umap_y": 2.24039363861084,
                "color": "#9EDAE5"
            },
            {
                "text": "Problems that can be efficiently addressed with Grover's algorithm have the following properties:[77][78] There is no searchable structure in the collection of possible answers, The number of possible answers to check is the same as the number of inputs to the algorithm, and There exists a Boolean function that evaluates each input and determines whether it is the correct answer.",
                "umap_x": 1.2232027053833008,
                "umap_y": 2.3296992778778076,
                "color": "#9EDAE5"
            },
            {
                "text": "For problems with all these properties, the running time of Grover's algorithm on a quantum computer scales as the square root of the number of inputs (or elements in the database), as opposed to the linear scaling of classical algorithms. A general class of problems to which Grover's algorithm can be applied[79] is a Boolean satisfiability problem, where the database through which the algorithm iterates is that of all possible answers. An example and possible application of this is a password cracker that attempts to guess a password. Breaking symmetric ciphers with this algorithm is of interest to government agencies.[80]",
                "umap_x": 1.3056015968322754,
                "umap_y": 2.382495641708374,
                "color": "#9EDAE5"
            }
        ]
    },
    "Quantum annealing": {
        "color": "#393B79",
        "topic": "Algorithms",
        "umap_values": [
            {
                "text": "Quantum annealing relies on the adiabatic theorem to undertake calculations. A system is placed in the ground state for a simple Hamiltonian, which slowly evolves to a more complicated Hamiltonian whose ground state represents the solution to the problem in question. The adiabatic theorem states that if the evolution is slow enough the system will stay in its ground state at all times through the process. Adiabatic optimization may be helpful for solving computational biology problems.",
                "umap_x": 1.4668149948120117,
                "umap_y": 1.727697730064392,
                "color": "#393B79"
            }
        ]
    },
    "Machine learning": {
        "color": "#637939",
        "topic": "Algorithms",
        "umap_values": [
            {
                "text": "Since quantum computers can produce outputs that classical computers cannot produce efficiently, and since quantum computation is fundamentally linear algebraic, some express hope in developing quantum algorithms that can speed up machine learning tasks",
                "umap_x": 0.6700789332389832,
                "umap_y": 1.6007310152053833,
                "color": "#637939"
            },
            {
                "text": "For example, the HHL Algorithm, named after its discoverers Harrow, Hassidim, and Lloyd, is believed to provide speedup over classical counterparts.[46][83] Some research groups have recently explored the use of quantum annealing hardware for training Boltzmann machines and deep neural networks",
                "umap_x": 1.262600302696228,
                "umap_y": 1.9176263809204102,
                "color": "#637939"
            },
            {
                "text": "Deep generative chemistry models emerge as powerful tools to expedite drug discovery. However, the immense size and complexity of the structural space of all possible drug-like molecules pose significant obstacles, which could be overcome in the future by quantum computers. Quantum computers are naturally good for solving complex quantum many-body problems[21] and thus may be instrumental in applications involving quantum chemistry. Therefore, one can expect that quantum-enhanced generative models[87] including quantum GANs[88] may eventually be developed into ultimate generative chemistry algorithms.",
                "umap_x": 2.2175590991973877,
                "umap_y": 1.0232657194137573,
                "color": "#637939"
            }
        ]
    },
    "Engineering": {
        "color": "#8C6D31",
        "umap_values": [
            {
                "text": "As of 2023, classical computers outperform quantum computers for all real-world applications. While current quantum computers may speed up solutions to particular mathematical problems, they give no computational advantage for practical tasks. Scientists and engineers are exploring multiple technologies for quantum computing hardware and hope to develop scalable quantum architectures, but serious obstacles remain",
                "umap_x": 0.6176280379295349,
                "umap_y": 0.9936668872833252,
                "color": "#8C6D31"
            }
        ]
    },
    "Challenges": {
        "color": "#843C39",
        "topic": "Engineering",
        "umap_values": [
            {
                "text": "There are a number of technical challenges in building a large-scale quantum computer.[91] Physicist David DiVincenzo has listed these requirements for a practical quantum computer:[92] Physically scalable to increase the number of qubits, Qubits that can be initialized to arbitrary values,Quantum gates that are faster than decoherence time,Universal gate set,Qubits that can be read easily.",
                "umap_x": 0.4618481397628784,
                "umap_y": 0.7086660861968994,
                "color": "#843C39"
            },
            {
                "text": "Sourcing parts for quantum computers is also very difficult. Superconducting quantum computers, like those constructed by Google and IBM, need helium-3, a nuclear research byproduct, and special superconducting cables made only by the Japanese company Coax Co",
                "umap_x": 0.8016822934150696,
                "umap_y": 0.02155805192887783,
                "color": "#843C39"
            },
            {
                "text": "The control of multi-qubit systems requires the generation and coordination of a large number of electrical signals with tight and deterministic timing resolution. This has led to the development of quantum controllers that enable interfacing with the qubits. Scaling these systems to support a growing number of qubits is an additional challenge.",
                "umap_x": 0.1720615178346634,
                "umap_y": 0.7417024970054626,
                "color": "#843C39"
            },
            {
                "text": "One of the greatest challenges involved with constructing quantum computers is controlling or removing quantum decoherence. This usually means isolating the system from its environment as interactions with the external world cause the system to decohere. However, other sources of decoherence also exist. Examples include the quantum gates, and the lattice vibrations and background thermonuclear spin of the physical system used to implement the qubits. Decoherence is irreversible, as it is effectively non-unitary, and is usually something that should be highly controlled, if not avoided. Decoherence times for candidate systems in particular, the transverse relaxation time T2 (for NMR and MRI technology, also called the dephasing time), typically range between nanoseconds and seconds at low temperature.[95] Currently, some quantum computers require their qubits to be cooled to 20 millikelvin (usually using a dilution refrigerator[96]) in order to prevent significant decoherence.[97] A 2020 study argues that ionizing radiation such as cosmic rays can nevertheless cause certain systems to decohere within milliseconds.",
                "umap_x": 1.0137070417404175,
                "umap_y": 0.6063175797462463,
                "color": "#843C39"
            }
        ]
    },
    "Decoherence": {
        "color": "#7B4173",
        "topic": "Engineering",
        "subtopic": "Challenges",
        "umap_values": [
            {
                "text": "As a result, time-consuming tasks may render some quantum algorithms inoperable, as attempting to maintain the state of qubits for a long enough duration will eventually corrupt the superpositions.",
                "umap_x": 0.2940506339073181,
                "umap_y": 1.1986160278320312,
                "color": "#7B4173"
            },
            {
                "text": "These issues are more difficult for optical approaches as the timescales are orders of magnitude shorter and an often-cited approach to overcoming them is optical pulse shaping. Error rates are typically proportional to the ratio of operating time to decoherence time; hence any operation must be completed much more quickly than the decoherence time.",
                "umap_x": 1.0211601257324219,
                "umap_y": 0.6210765242576599,
                "color": "#7B4173"
            },
            {
                "text": "As described by the threshold theorem, if the error rate is small enough, it is thought to be possible to use quantum error correction to suppress errors and decoherence. This allows the total calculation time to be longer than the decoherence time if the error correction scheme can correct errors faster than decoherence introduces them. An often-cited figure for the required error rate in each gate for fault-tolerant computation is 10−3, assuming the noise is depolarizing.",
                "umap_x": 0.9342657327651978,
                "umap_y": 0.7134855389595032,
                "color": "#7B4173"
            },
            {
                "text": "Meeting this scalability condition is possible for a wide range of systems. However, the use of error correction brings with it the cost of a greatly increased number of required qubits. The number required to factor integers using Shor's algorithm is still polynomial, and thought to be between L and L2, where L is the number of binary digits in the number to be factored; error correction algorithms would inflate this figure by an additional factor of L. For a 1000-bit number, this implies a need for about 104 bits without error correction.[100] With error correction, the figure would rise to about 107 bits. Computation time is about L2 or about 107 steps and at 1 MHz, about 10 seconds. However, the encoding and error-correction overheads increase the size of a real fault-tolerant quantum computer by several orders of magnitude. Careful estimates[101][102] show that at least 3 million physical qubits would factor 2,048-bit integer in 5 months on a fully error-corrected trapped-ion quantum computer. In terms of the number of physical qubits, to date, this remains the lowest estimate[103] for practically useful integer factorization problem sizing 1,024-bit or larger.",
                "umap_x": 0.8025233745574951,
                "umap_y": 0.8091784119606018,
                "color": "#7B4173"
            },
            {
                "text": "Another approach to the stability-decoherence problem is to create a topological quantum computer with anyons, quasi-particles used as threads, and relying on braid theory to form stable logic gates",
                "umap_x": 2.3360679149627686,
                "umap_y": 0.6301635503768921,
                "color": "#7B4173"
            }
        ]
    },
    "Quantum supremacy": {
        "color": "#1F77B4",
        "topic": "Engineering",
        "umap_values": [
            {
                "text": "Physicist John Preskill coined the term quantum supremacy to describe the engineering feat of demonstrating that a programmable quantum device can solve a problem beyond the capabilities of state-of-the-art classical computers.[106][107][108] The problem need not be useful, so some view the quantum supremacy test only as a potential future benchmark.",
                "umap_x": 1.8266806602478027,
                "umap_y": -0.7742878794670105,
                "color": "#1F77B4"
            },
            {
                "text": "In October 2019, Google AI Quantum, with the help of NASA, became the first to claim to have achieved quantum supremacy by performing calculations on the Sycamore quantum computer more than 3,000,000 times faster than they could be done on Summit, generally considered the world's fastest computer.[27][110][111] This claim has been subsequently challenged: IBM has stated that Summit can perform samples much faster than claimed,[112][113] and researchers have since developed better algorithms for the sampling problem used to claim quantum supremacy, giving substantial reductions to the gap between Sycamore and classical supercomputers[114][115][116] and even beating it.",
                "umap_x": 2.200669288635254,
                "umap_y": -0.8175656199455261,
                "color": "#1F77B4"
            },
            {
                "text": "In December 2020, a group at USTC implemented a type of Boson sampling on 76 photons with a photonic quantum computer, Jiuzhang, to demonstrate quantum supremacy.[120][121][122] The authors claim that a classical contemporary supercomputer would require a computational time of 600 million years to generate the number of samples their quantum processor can generate in 20 seconds",
                "umap_x": 2.175072193145752,
                "umap_y": -0.4714457094669342,
                "color": "#1F77B4"
            },
            {
                "text": "Claims of quantum supremacy have generated hype around quantum computing,[124] but they are based on contrived benchmark tasks that do not directly imply useful real-world applications",
                "umap_x": 1.9545303583145142,
                "umap_y": -0.7318933606147766,
                "color": "#1F77B4"
            },
            {
                "text": "In January 2024, a study published in Physical Review Letters provided direct verification of quantum supremacy experiments by computing exact amplitudes for experimentally generated bitstrings using a new-generation Sunway supercomputer, demonstrating a significant leap in simulation capability built on a multiple-amplitude tensor network contraction algorithm. This development underscores the evolving landscape of quantum computing, highlighting both the progress and the complexities involved in validating quantum supremacy claims.",
                "umap_x": 1.706965684890747,
                "umap_y": -0.7218847274780273,
                "color": "#1F77B4"
            }
        ]
    },
    "Skepticism": {
        "color": "#FFDDAA",
        "topic": "Engineering",
        "umap_values": [
            {
                "text": "Despite high hopes for quantum computing, significant progress in hardware, and optimism about future applications, a 2023 Nature spotlight article summarized current quantum computers as being \"For now, [good for] absolutely nothing\".[89] The article elaborated that quantum computers are yet to be more useful or efficient than conventional computers in any case, though it also argued that in the long term such computers are likely to be useful. A 2023 Communications of the ACM article[90] found that current quantum computing algorithms are \"insufficient for practical quantum advantage without significant improvements across the software/hardware stack\". It argues that the most promising candidates for achieving speedup with quantum computers are \"small-data problems\", for example in chemistry and materials science. However, the article also concludes that a large range of the potential applications it considered, such as machine learning, \"will not achieve quantum advantage with current quantum algorithms in the foreseeable future\", and it identified I/O constraints that make speedup unlikely for \"big data problems, unstructured linear systems, and database search based on Grover's algorithm\".",
                "umap_x": 1.2010154724121094,
                "umap_y": 1.2708156108856201,
                "color": "#FFDDAA"
            },
            {
                "text": "This state of affairs can be traced to several current and long-term considerations. Conventional computer hardware and algorithms are not only optimized for practical tasks, but are still improving rapidly, particularly GPU accelerators. Current quantum computing hardware generates only a limited amount of entanglement before getting overwhelmed by noise. Quantum algorithms provide speedup over conventional algorithms only for some tasks, and matching these tasks with practical applications proved challenging. Some promising tasks and applications require resources far beyond those available today.[127][128] In particular, processing large amounts of non-quantum data is a challenge for quantum computers.[90] Some promising algorithms have been 'dequantized', i.e., their non-quantum analogues with similar complexity have been found. If quantum error correction is used to scale quantum computers to practical applications, its overhead may undermine speedup offered by many quantum algorithms.[90] Complexity analysis of algorithms sometimes makes abstract assumptions that do not hold in applications. For example, input data may not already be available encoded in quantum states, and 'oracle functions' used in Grover's algorithm often have internal structure that can be exploited for faster algorithms.",
                "umap_x": 0.8524503111839294,
                "umap_y": 1.5732321739196777,
                "color": "#FFDDAA"
            },
            {
                "text": "In particular, building computers with large numbers of qubits may be futile if those qubits are not connected well enough and cannot maintain sufficiently high degree of entanglement for a long time. When trying to outperform conventional computers, quantum computing researchers often look for new tasks that can be solved on quantum computers, but this leaves the possibility that efficient non-quantum techniques will be developed in response, as seen for Quantum supremacy demonstrations. Therefore, it is desirable to prove lower bounds on the complexity of best possible non-quantum algorithms (which may be unknown) and show that some quantum algorithms asymptomatically improve upon those bounds.",
                "umap_x": 0.8398752212524414,
                "umap_y": 1.5835297107696533,
                "color": "#FFDDAA"
            },
            {
                "text": "Some researchers have expressed skepticism that scalable quantum computers could ever be built, typically because of the issue of maintaining coherence at large scales, but also for other reasons.",
                "umap_x": 0.5767173171043396,
                "umap_y": 0.6424474120140076,
                "color": "#FFDDAA"
            },
            {
                "text": "Bill Unruh doubted the practicality of quantum computers in a paper published in 1994.[129] Paul Davies argued that a 400-qubit computer would even come into conflict with the cosmological information bound implied by the holographic principle.[130] Skeptics like Gil Kalai doubt that quantum supremacy will ever be achieved.[131][132][133] Physicist Mikhail Dyakonov has expressed skepticism of quantum computing as follows:'So the number of continuous parameters describing the state of such a useful quantum computer at any given moment must be... about 10300... Could we ever learn to control the more than 10300 continuously variable parameters defining the quantum state of such a system? My answer is simple. No, never.",
                "umap_x": 0.7806536555290222,
                "umap_y": 0.6628109216690063,
                "color": "#FFDDAA"
            }
        ]
    },
    "Physical realizations": {
        "color": "#030027",
        "topic": "Engineering",
        "umap_values": [
            {
                "text": "A practical quantum computer must use a physical system as a programmable quantum register.[137] Researchers are exploring several technologies as candidates for reliable qubit implementations.[138] Superconductors and trapped ions are some of the most developed proposals, but experimentalists are considering other hardware possibilities as well.",
                "umap_x": 0.5012415647506714,
                "umap_y": 0.20415668189525604,
                "color": "#030027"
            },
            {
                "text": "The first quantum logic gates were implemented with trapped ions and prototype general purpose machines with up to 20 qubits have been realized. However, the technology behind these devices combines complex vacuum equipment, lasers, microwave and radio frequency equipment making full scale processors difficult to integrate with standard computing equipment. Moreover, the trapped ion system itself has engineering challenges to overcome",
                "umap_x": 0.2598760724067688,
                "umap_y": 0.4714110195636749,
                "color": "#030027"
            },
            {
                "text": "The largest commercial systems are based on superconductor devices and have scaled to 2000 qubits. However, the error rates for larger machines have been on the order of 5%. Technologically these devices are all cryogenic and scaling to large numbers of qubits requires wafer-scale integration, a serious engineering challenge by itself.",
                "umap_x": 0.36803868412971497,
                "umap_y": 0.355311781167984,
                "color": "#030027"
            },
            {
                "text": "Research efforts to create stabler qubits for quantum computing include topological quantum computer approaches. For example, Microsoft is working on a computer based on the quantum properties of two-dimensional quasiparticles called anyons.",
                "umap_x": 2.078856945037842,
                "umap_y": 0.57254558801651,
                "color": "#030027"
            }
        ]
    },
    "Potential applications": {
        "color": "#D62728",
        "umap_values": [
            {
                "text": "With focus on business management's point of view, the potential applications of quantum computing into four major categories are cybersecurity, data analytics and artificial intelligence, optimization and simulation, and data management and searching",
                "umap_x": 1.3966387510299683,
                "umap_y": 0.9030690789222717,
                "color": "#D62728"
            },
            {
                "text": "Investment in quantum computing research has increased in the public and private sectors.[146][147] As one consulting firm summarized,[148] ... investment dollars are pouring in, and quantum-computing start-ups are proliferating. ... While quantum computing promises to help businesses solve problems that are beyond the reach and speed of conventional high-performance computers, use cases are largely experimental and hypothetical at this early stage.",
                "umap_x": 1.4929343461990356,
                "umap_y": 0.7673362493515015,
                "color": "#D62728"
            }
        ]
    },
    "Computability": {
        "color": "#8C564B",
        "topic": "Theory",
        "umap_values": [
            {
                "text": "Any computational problem solvable by a classical computer is also solvable by a quantum computer.[149] Intuitively, this is because it is believed that all physical phenomena, including the operation of classical computers, can be described using quantum mechanics, which underlies the operation of quantum computers.",
                "umap_x": 0.4134349822998047,
                "umap_y": 1.828526496887207,
                "color": "#8C564B"
            },
            {
                "text": "Conversely, any problem solvable by a quantum computer is also solvable by a classical computer. It is possible to simulate both quantum and classical computers manually with just some paper and a pen, if given enough time. More formally, any quantum computer can be simulated by a Turing machine. In other words, quantum computers provide no additional power over classical computers in terms of computability. This means that quantum computers cannot solve undecidable problems like the halting problem, and the existence of quantum computers does not disprove the Church–Turing thesis.",
                "umap_x": 0.4777086675167084,
                "umap_y": 1.6621023416519165,
                "color": "#8C564B"
            }
        ]
    },
    "Complexity": {
        "color": "#17093f",
        "topic": "Theory",
        "umap_values": [
            {
                "text": "While quantum computers cannot solve any problems that classical computers cannot already solve, it is suspected that they can solve certain problems faster than classical computers. For instance, it is known that quantum computers can efficiently factor integers, while this is not believed to be the case for classical computers.",
                "umap_x": 0.4841994643211365,
                "umap_y": 1.8920774459838867,
                "color": "#17093f"
            },
            {
                "text": "The class of problems that can be efficiently solved by a quantum computer with bounded error is called BQP, for \"bounded error, quantum, polynomial time\". More formally, BQP is the class of problems that can be solved by a polynomial-time quantum Turing machine with an error probability of at most 1/3. As a class of probabilistic problems, BQP is the quantum counterpart to BPP (\"bounded error, probabilistic, polynomial time\"), the class of problems that can be solved by polynomial-time probabilistic Turing machines with bounded error.[152] It is known that and is widely suspected that , which intuitively would mean that quantum computers are more powerful than classical computers in terms of time complexity.[153]",
                "umap_x": 0.5323027968406677,
                "umap_y": 1.9139405488967896,
                "color": "#17093f"
            },
            {
                "text": "The exact relationship of BQP to P, NP, and PSPACE is not known. However, it is known that ; that is, all problems that can be efficiently solved by a deterministic classical computer can also be efficiently solved by a quantum computer, and all problems that can be efficiently solved by a quantum computer can also be solved by a deterministic classical computer with polynomial space resources. It is further suspected that BQP is a strict superset of P, meaning there are problems that are efficiently solvable by quantum computers that are not efficiently solvable by deterministic classical computers. For instance, integer factorization and the discrete logarithm problem are known to be in BQP and are suspected to be outside of P. On the relationship of BQP to NP, little is known beyond the fact that some NP problems that are believed not to be in P are also in BQP (integer factorization and the discrete logarithm problem are both in NP, for example). It is suspected that ; that is, it is believed that there are efficiently checkable problems that are not efficiently solvable by a quantum computer. As a direct consequence of this belief, it is also suspected that BQP is disjoint from the class of NP-complete problems (if an NP-complete problem were in BQP, then it would follow from NP-hardness that all problems in NP are in BQP).[154]",
                "umap_x": 0.5512145757675171,
                "umap_y": 1.9698594808578491,
                "color": "#17093f"
            }
        ]
    },
    "Notes": {
        "color": "#1d3445",
        "umap_values": [
            {
                "text": " As used in this article, 'exponentially faster' has a precise complexity theoretical meaning. Usually, it means that as a function of input size in bits, the best known classical algorithm for a problem requires an exponentially growing number of steps, while a quantum algorithm uses only a polynomial number of steps.",
                "umap_x": 0.7756083607673645,
                "umap_y": 2.08731746673584,
                "color": "#1d3445"
            },
            {
                "text": "The standard basis is also the computational basis.",
                "umap_x": 2.0166516304016113,
                "umap_y": 1.4026228189468384,
                "color": "#1d3445"
            }
        ]
    },
   
    
    "Sources": {
        "color": "#17BECF",
        "umap_values": [
            {
                "text": "Aaronson, Scott (2013). Quantum Computing Since Democritus. Cambridge University",
                "umap_x": 4.404345989227295,
                "umap_y": 0.24877238273620605,
                "color": "#17BECF"
            },
            {
                "text": "Press. doi:10.1017/CBO9780511979309 (https://doi.org/10.1017%2FCBO9780511979309).",
                "umap_x": 5.687187194824219,
                "umap_y": 5.218937873840332,
                "color": "#17BECF"
            },
            {
                "text": "ISBN 978-0-521-19956-8. OCLC 829706638 (https://search.worldcat.org/oclc/829706638).",
                "umap_x": 6.298770427703857,
                "umap_y": 2.663235902786255,
                "color": "#17BECF"
            },
            {
                "text": "Grumbling, Emily; Horowitz, Mark, eds. (2019). Quantum Computing: Progress and",
                "umap_x": 4.535480976104736,
                "umap_y": 0.6354182958602905,
                "color": "#17BECF"
            },
            {
                "text": "Prospects. Washington, DC: The National Academies Press. doi:10.17226/25196 (https://do i.org/10.17226%2F25196). ISBN 978-0-309-47970-7. OCLC 1091904777 (https://search.wo rldcat.org/oclc/1091904777). S2CID 125635007 (https://api.semanticscholar.org/CorpusID:1 25635007).",
                "umap_x": 6.355422019958496,
                "umap_y": 3.522979974746704,
                "color": "#17BECF"
            },
            {
                "text": "Mermin, N. David (2007). Quantum Computer Science: An Introduction. doi:10.1017/CBO9780511813870 (https://doi.org/10.1017%2FCBO9780511813870).",
                "umap_x": 4.4283447265625,
                "umap_y": 0.8889657258987427,
                "color": "#17BECF"
            },
            {
                "text": "ISBN 978-0-511-34258-5. OCLC 422727925 (https://search.worldcat.org/oclc/422727925).",
                "umap_x": 6.279762268066406,
                "umap_y": 2.6490345001220703,
                "color": "#17BECF"
            },
            {
                "text": "Nielsen, Michael; Chuang, Isaac (2010). Quantum Computation and Quantum Information (10th anniversary ed.). doi:10.1017/CBO9780511976667 (https://doi.org/10.1017%2FCBO9 780511976667). ISBN 978-0-511-99277-3. OCLC 700706156 (https://search.worldcat.org/o clc/700706156). S2CID 59717455 (https://api.semanticscholar.org/CorpusID:59717455).",
                "umap_x": 4.58667516708374,
                "umap_y": 1.5124815702438354,
                "color": "#17BECF"
            },
            {
                "text": "Shor, Peter W. (1994). Algorithms for Quantum Computation: Discrete Logarithms and",
                "umap_x": 3.866941213607788,
                "umap_y": 1.1912868022918701,
                "color": "#17BECF"
            },
            {
                "text": "Factoring. Symposium on Foundations of Computer Science. Santa Fe, New Mexico: IEEE. pp. 124–134. doi:10.1109/SFCS.1994.365700 (https://doi.org/10.1109%2FSFCS.1994.3657 00). ISBN 978-0-8186-6580-6.",
                "umap_x": 4.300556659698486,
                "umap_y": 2.502063274383545,
                "color": "#17BECF"
            }
        ]
    },
    "Textbooks": {
        "color": "#FFBB78",
        "topic": "Further reading",
        "umap_values": [
            {
                "text": "Akama, Seiki (2014). Elements of Quantum Computing: History, Theories and Engineering",
                "umap_x": 4.374557018280029,
                "umap_y": 0.3543730080127716,
                "color": "#FFBB78"
            },
            {
                "text": "Applications. Springer. doi:10.1007/978-3-319-08284-4 (https://doi.org/10.1007%2F978-3-3 19-08284-4). ISBN 978-3-319-08284-4. OCLC 884786739 (https://search.worldcat.org/oclc/ 884786739).",
                "umap_x": 6.0007123947143555,
                "umap_y": 2.659198045730591,
                "color": "#FFBB78"
            },
            {
                "text": "Benenti, Giuliano; Casati, Giulio; Rossini, Davide; Strini, Giuliano (2019). Principles of",
                "umap_x": 7.5505805015563965,
                "umap_y": 3.9730958938598633,
                "color": "#FFBB78"
            },
            {
                "text": "Quantum Computation and Information: A Comprehensive Textbook (2nd ed.). doi:10.1142/10909 (https://doi.org/10.1142%2F10909). ISBN 978-981-3237-23-0.",
                "umap_x": 4.758081912994385,
                "umap_y": 1.2999986410140991,
                "color": "#FFBB78"
            },
            {
                "text": "OCLC 1084428655 (https://search.worldcat.org/oclc/1084428655). S2CID 62280636 (http s://api.semanticscholar.org/CorpusID:62280636).",
                "umap_x": 6.510015964508057,
                "umap_y": 3.56453800201416,
                "color": "#FFBB78"
            },
            {
                "text": "Bernhardt, Chris (2019). Quantum Computing for Everyone. MIT Press. ISBN 978-0-262- 35091-4. OCLC 1082867954 (https://search.worldcat.org/oclc/1082867954).",
                "umap_x": 5.363604545593262,
                "umap_y": 1.5427395105361938,
                "color": "#FFBB78"
            },
            {
                "text": "Hidary, Jack D. (2021). Quantum Computing: An Applied Approach (2nd ed.). doi:10.1007/978-3-030-83274-2 (https://doi.org/10.1007%2F978-3-030-83274-2). ISBN 978- 3-03-083274-2. OCLC 1272953643 (https://search.worldcat.org/oclc/1272953643).",
                "umap_x": 4.484976291656494,
                "umap_y": 1.0469423532485962,
                "color": "#FFBB78"
            },
            {
                "text": "S2CID 238223274 (https://api.semanticscholar.org/CorpusID:238223274).",
                "umap_x": 6.743719577789307,
                "umap_y": 3.8007571697235107,
                "color": "#FFBB78"
            },
            {
                "text": "Hiroshi, Imai; Masahito, Hayashi, eds. (2006). Quantum Computation and Information: From",
                "umap_x": 4.400343418121338,
                "umap_y": 1.021256446838379,
                "color": "#FFBB78"
            },
            {
                "text": "Theory to Experiment. Topics in Applied Physics. Vol. 102. doi:10.1007/3-540-33133-6 (http s://doi.org/10.1007%2F3-540-33133-6). ISBN 978-3-540-33133-9.",
                "umap_x": 4.846671104431152,
                "umap_y": 1.823928952217102,
                "color": "#FFBB78"
            },
            {
                "text": "Hughes, Ciaran; Isaacson, Joshua; Perry, Anastasia; Sun, Ranbel F.; Turner, Jessica (2021). Quantum Computing for the Quantum Curious (https://link.springer.com/book/10.100 7/978-3-030-61601-4). doi:10.1007/978-3-030-61601-4 (https://doi.org/10.1007%2F978-3-0 30-61601-4). ISBN 978-3-03-061601-4. OCLC 1244536372 (https://search.worldcat.org/ocl c/1244536372). S2CID 242566636 (https://api.semanticscholar.org/CorpusID:242566636).",
                "umap_x": 4.580041885375977,
                "umap_y": 1.4609612226486206,
                "color": "#FFBB78"
            },
            {
                "text": "Jaeger, Gregg (2007). Quantum Information: An Overview. doi:10.1007/978-0-387-36944-0 (https://doi.org/10.1007%2F978-0-387-36944-0). ISBN 978-0-387-36944-0.",
                "umap_x": 4.846635341644287,
                "umap_y": 1.4642906188964844,
                "color": "#FFBB78"
            },
            {
                "text": "OCLC 186509710 (https://search.worldcat.org/oclc/186509710).",
                "umap_x": 6.472059726715088,
                "umap_y": 3.1956026554107666,
                "color": "#FFBB78"
            },
            {
                "text": "Johnston, Eric R.; Harrigan, Nic; Gimeno-Segovia, Mercedes (2019). Programming",
                "umap_x": 7.4834699630737305,
                "umap_y": 4.028132438659668,
                "color": "#FFBB78"
            },
            {
                "text": "Quantum Computers: Essential Algorithms and Code Samples. O'Reilly Media,",
                "umap_x": 4.232470989227295,
                "umap_y": 0.28983166813850403,
                "color": "#FFBB78"
            },
            {
                "text": "Incorporated. ISBN 978-1-4920-3968-6. OCLC 1111634190 (https://search.worldcat.org/ocl c/1111634190).",
                "umap_x": 6.268041133880615,
                "umap_y": 2.7136805057525635,
                "color": "#FFBB78"
            },
            {
                "text": "Kaye, Phillip; Laflamme, Raymond; Mosca, Michele (2007). An Introduction to Quantum",
                "umap_x": 5.051326274871826,
                "umap_y": 0.7683895826339722,
                "color": "#FFBB78"
            },
            {
                "text": "Computing. OUP Oxford. ISBN 978-0-19-857000-4. OCLC 85896383 (https://search.worldc at.org/oclc/85896383).",
                "umap_x": 5.630499839782715,
                "umap_y": 2.3565919399261475,
                "color": "#FFBB78"
            },
            {
                "text": "Kitaev, Alexei Yu.; Shen, Alexander H.; Vyalyi, Mikhail N. (2002). Classical and Quantum",
                "umap_x": 5.120753765106201,
                "umap_y": 0.8403388857841492,
                "color": "#FFBB78"
            },
            {
                "text": "Computation. American Mathematical Soc. ISBN 978-0-8218-3229-5. OCLC 907358694 (htt ps://search.worldcat.org/oclc/907358694).",
                "umap_x": 4.677964687347412,
                "umap_y": 2.129140615463257,
                "color": "#FFBB78"
            },
            {
                "text": "Kurgalin, Sergei; Borzunov, Sergei (2021). Concise Guide to Quantum Computing:",
                "umap_x": 4.581392288208008,
                "umap_y": 0.6830695271492004,
                "color": "#FFBB78"
            },
            {
                "text": "Algorithms, Exercises, and Implementations (https://dx.doi.org/10.1007/978-3-030-65052-0).",
                "umap_x": 4.157820701599121,
                "umap_y": 2.127847194671631,
                "color": "#FFBB78"
            },
            {
                "text": "Springer. doi:10.1007/978-3-030-65052-0 (https://doi.org/10.1007%2F978-3-030-65052-0).",
                "umap_x": 5.706902503967285,
                "umap_y": 5.049324035644531,
                "color": "#FFBB78"
            },
            {
                "text": "ISBN 978-3-030-65052-0.",
                "umap_x": 6.255533218383789,
                "umap_y": 2.5799753665924072,
                "color": "#FFBB78"
            },
            {
                "text": "Stolze, Joachim; Suter, Dieter (2004). Quantum Computing: A Short Course from Theory to",
                "umap_x": 4.657051086425781,
                "umap_y": 0.8302428722381592,
                "color": "#FFBB78"
            },
            {
                "text": "Experiment. doi:10.1002/9783527617760 (https://doi.org/10.1002%2F9783527617760).",
                "umap_x": 5.553145885467529,
                "umap_y": 4.924943447113037,
                "color": "#FFBB78"
            },
            {
                "text": "ISBN 978-3-527-61776-0. OCLC 212140089 (https://search.worldcat.org/oclc/212140089).",
                "umap_x": 6.187619686126709,
                "umap_y": 2.5720813274383545,
                "color": "#FFBB78"
            },
            {
                "text": "Susskind, Leonard; Friedman, Art (2014). Quantum Mechanics: The Theoretical Minimum.",
                "umap_x": 4.882029056549072,
                "umap_y": 0.6762413382530212,
                "color": "#FFBB78"
            },
            {
                "text": "New York: Basic Books. ISBN 978-0-465-08061-8.",
                "umap_x": 6.371916770935059,
                "umap_y": 2.573723554611206,
                "color": "#FFBB78"
            },
            {
                "text": "Wichert, Andreas (2020). Principles of Quantum Artificial Intelligence: Quantum Problem",
                "umap_x": 4.873617649078369,
                "umap_y": 0.5422024130821228,
                "color": "#FFBB78"
            },
            {
                "text": "Solving and Machine Learning (2nd ed.). doi:10.1142/11938 (https://doi.org/10.1142%2F11 938). ISBN 978-981-12-2431-7. OCLC 1178715016 (https://search.worldcat.org/oclc/11787 15016). S2CID 225498497 (https://api.semanticscholar.org/CorpusID:225498497).",
                "umap_x": 5.008024215698242,
                "umap_y": 2.1867122650146484,
                "color": "#FFBB78"
            },
            {
                "text": "Wong, Thomas (2022). Introduction to Classical and Quantum Computing (https://web.archi ve.org/web/20220129214631/http://www.thomaswong.net/introduction-to-classical-and-quan tum-computing-1e.pdf) (PDF). Rooted Grove. ISBN 979-8-9855931-0-5. OCLC 1308951401 (https://search.worldcat.org/oclc/1308951401). Archived from the original (http://www.thoma swong.net/introduction-to-classical-and-quantum-computing-1e.pdf) (PDF) on 29 January 2022. Retrieved 6 February 2022.",
                "umap_x": 4.396630764007568,
                "umap_y": 1.1018481254577637,
                "color": "#FFBB78"
            },
            {
                "text": "Zeng, Bei; Chen, Xie; Zhou, Duan-Lu; Wen, Xiao-Gang (2019). Quantum Information Meets",
                "umap_x": 3.756976842880249,
                "umap_y": 1.5426284074783325,
                "color": "#FFBB78"
            },
            {
                "text": "Quantum Matter. arXiv:1508.02595 (https://arxiv.org/abs/1508.02595). doi:10.1007/978-1- 4939-9084-9 (https://doi.org/10.1007%2F978-1-4939-9084-9). ISBN 978-1-4939-9084-9.",
                "umap_x": 4.8668599128723145,
                "umap_y": 1.501981258392334,
                "color": "#FFBB78"
            },
            {
                "text": "OCLC 1091358969 (https://search.worldcat.org/oclc/1091358969). S2CID 118528258 (http s://api.semanticscholar.org/CorpusID:118528258).",
                "umap_x": 6.52115535736084,
                "umap_y": 3.488741397857666,
                "color": "#FFBB78"
            }
        ]
    },
    "Academic papers": {
        "color": "#98DF8A",
        "topic": "Further reading",
        "umap_values": [
            {
                "text": "Abbot, Derek; Doering, Charles R.; Caves, Carlton M.; Lidar, Daniel M.; Brandt, Howard E.; et al. (2003). \"Dreams versus Reality: Plenary Debate Session on Quantum Computing\".",
                "umap_x": 4.181042671203613,
                "umap_y": 0.05580815672874451,
                "color": "#98DF8A"
            },
            {
                "text": "Quantum Information Processing. 2 (6): 449–472. arXiv:quant-ph/0310130 (https://arxiv.org/ abs/quant-ph/0310130). Bibcode:2003QuIP....2..449A (https://ui.adsabs.harvard.edu/abs/20 03QuIP....2..449A). doi:10.1023/B:QINP.0000042203.24782.9a (https://doi.org/10.1023%2F",
                "umap_x": 3.3569045066833496,
                "umap_y": 1.7139087915420532,
                "color": "#98DF8A"
            },
            {
                "text": "B%3AQINP.0000042203.24782.9a). hdl:2027.42/45526 (https://hdl.handle.net/2027.42%2F 45526). S2CID 34885835 (https://api.semanticscholar.org/CorpusID:34885835).",
                "umap_x": 6.578002452850342,
                "umap_y": 3.9319236278533936,
                "color": "#98DF8A"
            },
            {
                "text": "Berthiaume, Andre (1 December 1998). \"Quantum Computation\". Solution Manual for",
                "umap_x": 3.988476276397705,
                "umap_y": 1.0695781707763672,
                "color": "#98DF8A"
            },
            {
                "text": "Quantum Mechanics. pp. 233–234. doi:10.1142/9789814541893_0016 (https://doi.org/10.11 42%2F9789814541893_0016). ISBN 978-981-4541-88-6. S2CID 128255429 (https://api.se manticscholar.org/CorpusID:128255429) – via Semantic Scholar.",
                "umap_x": 4.962272644042969,
                "umap_y": 1.737610101699829,
                "color": "#98DF8A"
            },
            {
                "text": "Academic papers",
                "umap_x": 5.899515151977539,
                "umap_y": 2.5332181453704834,
                "color": "#98DF8A"
            },
            {
                "text": "DiVincenzo, David P. (2000). \"The Physical Implementation of Quantum Computation\".",
                "umap_x": 4.086111545562744,
                "umap_y": 0.419808566570282,
                "color": "#98DF8A"
            },
            {
                "text": "Fortschritte der Physik. 48 (9–11): 771–783. arXiv:quant-ph/0002077 (https://arxiv.org/abs/q uant-ph/0002077). Bibcode:2000ForPh..48..771D (https://ui.adsabs.harvard.edu/abs/2000F orPh..48..771D). doi:10.1002/1521-3978(200009)48:9/11<771::AID-PROP771>3.0.CO;2-E (https://doi.org/10.1002%2F1521-3978%28200009%2948%3A9%2F11%3C771%3A%3AAI",
                "umap_x": 5.0189008712768555,
                "umap_y": 5.30881404876709,
                "color": "#98DF8A"
            },
            {
                "text": "D-PROP771%3E3.0.CO%3B2-E). S2CID 15439711 (https://api.semanticscholar.org/Corpus",
                "umap_x": 6.699771404266357,
                "umap_y": 3.901045799255371,
                "color": "#98DF8A"
            },
            {
                "text": "ID:15439711).",
                "umap_x": 6.893933296203613,
                "umap_y": 4.068099498748779,
                "color": "#98DF8A"
            },
            {
                "text": "DiVincenzo, David P. (1995). \"Quantum Computation\". Science. 270 (5234): 255–261.",
                "umap_x": 3.7132434844970703,
                "umap_y": 0.8263815641403198,
                "color": "#98DF8A"
            },
            {
                "text": "Bibcode:1995Sci...270..255D (https://ui.adsabs.harvard.edu/abs/1995Sci...270..255D).",
                "umap_x": 5.704991817474365,
                "umap_y": 6.141305923461914,
                "color": "#98DF8A"
            },
            {
                "text": "CiteSeerX 10.1.1.242.2165 (https://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.242. 2165). doi:10.1126/science.270.5234.255 (https://doi.org/10.1126%2Fscience.270.5234.25 5). S2CID 220110562 (https://api.semanticscholar.org/CorpusID:220110562). Table 1 lists switching and dephasing times for various systems.",
                "umap_x": 1.3146679401397705,
                "umap_y": 0.5825652480125427,
                "color": "#98DF8A"
            },
            {
                "text": "Jeutner, Valentin (2021). \"The Quantum Imperative: Addressing the Legal Dimension of",
                "umap_x": 5.058577060699463,
                "umap_y": 0.6744027733802795,
                "color": "#98DF8A"
            },
            {
                "text": "Quantum Computers\" (https://lup.lub.lu.se/record/e034e7b7-d17c-4863-9cee-7e654f97225 b). Morals & Machines. 1 (1): 52–59. doi:10.5771/2747-5174-2021-1-52 (https://doi.org/10.5 771%2F2747-5174-2021-1-52). S2CID 236664155 (https://api.semanticscholar.org/CorpusI",
                "umap_x": 3.1649084091186523,
                "umap_y": 0.30686935782432556,
                "color": "#98DF8A"
            },
            {
                "text": "D:236664155).",
                "umap_x": 6.913793087005615,
                "umap_y": 4.275446891784668,
                "color": "#98DF8A"
            },
            {
                "text": "Krantz, P.; Kjaergaard, M.; Yan, F.; Orlando, T. P.; Gustavsson, S.; Oliver, W. D. (17 June 2019). \"A Quantum Engineer's Guide to Superconducting Qubits\". Applied Physics Reviews. 6 (2): 021318. arXiv:1904.06560 (https://arxiv.org/abs/1904.06560).",
                "umap_x": 1.1632393598556519,
                "umap_y": -0.20710594952106476,
                "color": "#98DF8A"
            },
            {
                "text": "Bibcode:2019ApPRv...6b1318K (https://ui.adsabs.harvard.edu/abs/2019ApPRv...6b1318K). doi:10.1063/1.5089550 (https://doi.org/10.1063%2F1.5089550). ISSN 1931-9401 (https://se arch.worldcat.org/issn/1931-9401). S2CID 119104251 (https://api.semanticscholar.org/Corp usID:119104251).",
                "umap_x": 5.763521194458008,
                "umap_y": 5.945935249328613,
                "color": "#98DF8A"
            },
            {
                "text": "Mitchell, Ian (1998). \"Computing Power into the 21st Century: Moore's Law and Beyond\" (htt p://citeseer.ist.psu.edu/mitchell98computing.html).",
                "umap_x": 3.966379404067993,
                "umap_y": 0.3676688075065613,
                "color": "#98DF8A"
            },
            {
                "text": "Simon, Daniel R. (1994). \"On the Power of Quantum Computation\" (http://citeseer.ist.psu.ed u/simon94power.html). Institute of Electrical and Electronics Engineers Computer Society",
                "umap_x": 4.073585033416748,
                "umap_y": 0.6239738464355469,
                "color": "#98DF8A"
            }
        ]
    },
    "External links": {
        "color": "#FF9896",
        "umap_values": [
            {
                "text": "Media related to Quantum computer at Wikimedia Commons",
                "umap_x": 4.135616302490234,
                "umap_y": 0.12633489072322845,
                "color": "#FF9896"
            },
            {
                "text": "Learning materials related to Quantum computing at Wikiversity",
                "umap_x": 4.545831680297852,
                "umap_y": 0.7432851791381836,
                "color": "#FF9896"
            },
            {
                "text": "Stanford Encyclopedia of Philosophy: \"Quantum Computing (https://plato.stanford.edu/entrie s/qt-quantcomp/)\" by Amit Hagar and Michael E. Cuffaro. \"Quantum computation, theory of\" (https://www.encyclopediaofmath.org/index.php?title=Qua ntum_computation,_theory_of), Encyclopedia of Mathematics, EMS Press, 2001 [1994]",
                "umap_x": 4.719629287719727,
                "umap_y": 1.012636423110962,
                "color": "#FF9896"
            },
            {
                "text": "Lectures",
                "umap_x": 5.784593105316162,
                "umap_y": 1.6831008195877075,
                "color": "#FF9896"
            },
            {
                "text": "Quantum computing for the determined (https://www.youtube.com/playlist?list=PL1826E60F",
                "umap_x": 4.317319393157959,
                "umap_y": 0.3397698998451233,
                "color": "#FF9896"
            },
            {
                "text": "D05B44E4) – 22 video lectures by Michael Nielsen",
                "umap_x": 5.780614376068115,
                "umap_y": 1.6232959032058716,
                "color": "#FF9896"
            },
            {
                "text": "Video Lectures (http://www.quiprocone.org/Protected/DD_lectures.htm) by David Deutsch",
                "umap_x": 5.813137054443359,
                "umap_y": 1.7500306367874146,
                "color": "#FF9896"
            },
            {
                "text": "Lomonaco, Sam. Four Lectures on Quantum Computing given at Oxford University in July 2006 (http://www.csee.umbc.edu/~lomonaco/Lectures.html#OxfordLectures)",
                "umap_x": 4.697039604187012,
                "umap_y": 0.6929422616958618,
                "color": "#FF9896"
            },
            {
                "text": "Retrieved from \"https://en.wikipedia.org/w/index.php?title=Quantum_computing&oldid=1276772487\"",
                "umap_x": 3.630791425704956,
                "umap_y": 0.4629928171634674,
                "color": "#FF9896"
            }
        ]
    }
}